import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MARKETS, type Market } from "@lavion/schema";
import { ListingCard } from "@/components/listing-card";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getListings } from "@/lib/listings";

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
  };
}

/**
 * No motion provider on this route. Search results are judged on INP and LCP,
 * so GSAP and Lenis are never downloaded here — the split is enforced by the
 * bundle boundary rather than by convention.
 */
export default async function SearchPage({ params }: PageProps<"/[market]/search">) {
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
          {/* Results stream in; the shell above is prerendered. */}
          <Suspense fallback={<ResultsSkeleton />}>
            <Results market={m} />
          </Suspense>
        </div>
      </main>

      <SiteFooter market={m} />
    </>
  );
}

async function Results({ market }: { market: Market }) {
  const listings = await getListings(market);

  if (!listings.length) {
    return (
      <div className="border border-line bg-surface p-16 text-center">
        <p className="font-display text-2xl">Nothing listed here yet</p>
        <p className="mt-3 text-sm text-ink-soft">
          We are onboarding agencies in {MARKETS[market].label} now. Register
          your interest and we will contact you when inventory goes live.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="label mb-6 tnum">
        {listings.length} {listings.length === 1 ? "property" : "properties"}
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((l, i) => (
          <ListingCard key={l.slug} listing={l} priority={i < 3} />
        ))}
      </div>
    </>
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
