import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MARKETS, type Market } from "@lavion/schema";
import { ListingCard } from "@/components/listing-card";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getListings, type ListingSummary } from "@/lib/listings";

const VALID: Market[] = ["uk", "ae", "pk"];

export function generateStaticParams() {
  return VALID.map((market) => ({ market }));
}

export async function generateMetadata({ params }: PageProps<"/[market]/search">) {
  const { market } = await params;
  const label = MARKETS[market as Market]?.label ?? "";
  return {
    title: `Property for sale in ${label}`,
    description: `Search luxury property for sale and rent across ${label}.`,
    alternates: { canonical: `/${market}/search` },
    // Filtered result sets are never indexable — that is the crawl-budget rule
    // from the area guides applied to facets. The canonical above points every
    // filter combination back at the unfiltered page.
    robots: { index: true, follow: true },
  };
}

/**
 * No motion provider on this route. Search results are judged on INP and LCP,
 * so GSAP and Lenis are never downloaded here — the split is enforced by the
 * bundle boundary rather than by convention.
 */
export default async function SearchPage({
  params,
  searchParams,
}: PageProps<"/[market]/search">) {
  const { market } = await params;
  if (!VALID.includes(market as Market)) notFound();
  const m = market as Market;

  return (
    <>
      <SiteHeader market={m} />

      <main className="flex-1">
        <div className="border-b border-line bg-surface">
          <div className="mx-auto max-w-[1400px] px-6 py-12">
            <p className="label">{MARKETS[m].label}</p>
            <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.4rem)] leading-tight">
              Property for sale
            </h1>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-6 py-10">
          {/* searchParams is a runtime API, so everything that reads it streams
              while the shell above is prerendered. */}
          <Suspense fallback={<ResultsSkeleton />}>
            <Filtered market={m} searchParams={searchParams} />
          </Suspense>
        </div>
      </main>

      <SiteFooter market={m} />
    </>
  );
}

type SP = PageProps<"/[market]/search">["searchParams"];

async function Filtered({ market, searchParams }: { market: Market; searchParams: SP }) {
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const transaction = one("transaction");
  const goldenVisa = one("goldenVisaEligible") === "true";
  const minBeds = Number(one("minBeds") ?? "") || undefined;
  const maxPrice = Number(one("maxPrice") ?? "") || undefined;

  const all = await getListings(market);

  const listings = all.filter((l) => {
    if (transaction && l.transaction !== transaction) return false;
    if (minBeds !== undefined && (l.bedrooms ?? 0) < minBeds) return false;
    if (maxPrice !== undefined && l.price.amount > maxPrice) return false;
    // F04 — computed from listing data, not a hand-applied tag.
    if (goldenVisa) {
      if (l.tenure !== "freehold") return false;
      if (l.location.freeholdZone !== true) return false;
      if (l.price.currency !== "AED" || l.price.amount < 2_000_000) return false;
    }
    return true;
  });

  const filtered = Boolean(transaction || goldenVisa || minBeds || maxPrice);

  return (
    <>
      <Filters market={market} active={{ transaction, goldenVisa, minBeds, maxPrice }} />

      <p className="label mb-6 mt-8 tnum">
        {listings.length} {listings.length === 1 ? "property" : "properties"}
        {goldenVisa && " qualifying for the Golden Visa route"}
      </p>

      {listings.length === 0 ? (
        <div className="border border-line bg-surface p-16 text-center">
          <p className="font-display text-2xl">
            {filtered ? "Nothing matches those filters" : "Nothing listed here yet"}
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            {filtered
              ? "Try widening the search — or combine two properties to reach the Golden Visa threshold."
              : `We are onboarding agencies in ${MARKETS[market].label} now.`}
          </p>
          {filtered && (
            <Link href={`/${market}/search`} className="label mt-6 inline-block hover:text-brass">
              Clear filters &rarr;
            </Link>
          )}
        </div>
      ) : (
        <Results listings={listings} />
      )}
    </>
  );
}

function Filters({
  market,
  active,
}: {
  market: Market;
  active: {
    transaction?: string;
    goldenVisa: boolean;
    minBeds?: number;
    maxPrice?: number;
  };
}) {
  const chip = (label: string, href: string, on: boolean) => (
    <Link
      key={label}
      href={href}
      className={`label border px-4 py-2 transition-colors ${
        on ? "border-brass bg-brass-wash !text-brass" : "border-line hover:border-brass"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chip("All", `/${market}/search`, !active.transaction && !active.goldenVisa && !active.minBeds)}
      {chip("For sale", `/${market}/search?transaction=sale`, active.transaction === "sale")}
      {chip("To rent", `/${market}/search?transaction=rent`, active.transaction === "rent")}
      {chip("2+ beds", `/${market}/search?minBeds=2`, active.minBeds === 2)}
      {chip("3+ beds", `/${market}/search?minBeds=3`, active.minBeds === 3)}
      {market === "ae" &&
        chip(
          "Golden Visa eligible",
          `/${market}/search?goldenVisaEligible=true`,
          active.goldenVisa,
        )}
    </div>
  );
}

function Results({ listings }: { listings: ListingSummary[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((l, i) => (
        <ListingCard key={l.slug} listing={l} priority={i < 3} />
      ))}
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border border-line bg-surface">
          <div className="aspect-[4/3] animate-pulse bg-surface-2" />
          <div className="flex flex-col gap-3 p-5">
            <div className="h-7 w-2/5 animate-pulse bg-surface-2" />
            <div className="h-4 w-4/5 animate-pulse bg-surface-2" />
            <div className="h-4 w-1/3 animate-pulse bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  );
}
