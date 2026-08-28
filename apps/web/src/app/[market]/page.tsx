import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MARKETS, type Market } from "@lavion/schema";
import { MotionProvider } from "@/components/motion-provider";
import { Skyline } from "@/components/skyline";
import { ListingCard } from "@/components/listing-card";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getListings } from "@/lib/listings";
import { getAreaTaxonomy } from "@/lib/areas";

const VALID: Market[] = ["uk", "ae", "pk"];

export function generateStaticParams() {
  return VALID.map((market) => ({ market }));
}

/**
 * Three market sections sharing one language is exactly the configuration that
 * gets miscrawled, so hreflang is set at launch rather than retrofitted after
 * Google has indexed a broken structure. x-default points at the chooser.
 */
export async function generateMetadata({ params }: PageProps<"/[market]">) {
  const { market } = await params;
  const label = MARKETS[market as Market]?.label ?? "";
  return {
    title: `Luxury property in ${label}`,
    description: `Luxury property for sale and rent across ${label}, with ownership and residency rules made explicit before you enquire.`,
    alternates: {
      canonical: `/${market}`,
      languages: Object.fromEntries([
        // MARKETS carries real BCP-47 locales — the UK's region subtag is GB,
        // not UK, and an invalid hreflang is silently ignored by Google.
        ...VALID.map((m) => [MARKETS[m].locale, `/${m}`]),
        ["x-default", "/"],
      ]),
    },
  };
}

const HOOK: Record<Market, { eyebrow: string; line: string; sub: string }> = {
  uk: {
    eyebrow: "United Kingdom",
    line: "Tenure, yield and the whole picture.",
    sub: "Every UK listing carries its Material Information up front — tenure, council tax band, lease terms — so the numbers you decide on are the numbers that survive conveyancing.",
  },
  ae: {
    eyebrow: "United Arab Emirates",
    line: "Where AED 2M becomes ten years.",
    sub: "Freehold property in a designated zone at or above AED 2,000,000 opens the Golden Visa route. We flag which listings qualify before you enquire, not after.",
  },
  pk: {
    eyebrow: "Pakistan",
    line: "Buy from abroad, and take it home again.",
    sub: "Purchases funded through a Roshan Digital Account carry State Bank guaranteed repatriation — and let overseas Pakistanis pay advance tax at filer rates.",
  },
};

export default async function MarketHome({ params }: PageProps<"/[market]">) {
  const { market } = await params;
  if (!VALID.includes(market as Market)) notFound();
  const m = market as Market;

  const listings = await getListings(m, { limit: 6 });
  const copy = HOOK[m];

  return (
    <>
      {/* Brand surface: motion loads here and nowhere else. */}
      <MotionProvider smoothScroll />
      <SiteHeader market={m} />

      <main className="flex-1">
        {/* ---------- hero ---------- */}
        <section className="relative flex min-h-[calc(100svh-4.25rem)] flex-col justify-center overflow-hidden border-b border-line">
          {/* Ambient light behind the skyline — sun off the water for Dubai,
              low winter light for London, dusk haze for Lahore. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-[0.18]"
            style={{
              backgroundImage:
                "radial-gradient(58% 52% at 76% 22%, var(--color-brass) 0%, transparent 70%), linear-gradient(180deg, var(--color-petrol) 0%, transparent 60%)",
            }}
          />

          {/* Landmarks of the selected market, drawn not photographed. */}
          <Skyline market={m} />
          {/* Hairline grid — architectural, drawn in CSS so it costs nothing. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(to right, var(--color-line) 1px, transparent 1px)",
              backgroundSize: "clamp(80px, 9vw, 150px) 100%",
            }}
          />

          <div className="relative mx-auto w-full max-w-[1400px] px-6 pb-[clamp(110px,27vw,390px)] pt-16">
            <div className="max-w-4xl">
              <p data-rise="1" className="label">
                {copy.eyebrow}
              </p>
              <h1
                data-rise="2"
                className="mt-6 font-display text-[clamp(2.6rem,7vw,5.6rem)] font-normal leading-[0.98] tracking-[-0.02em]"
              >
                {copy.line}
              </h1>
              <div data-rise="3" className="rule-brass mt-8 w-40" />
              <p
                data-rise="3"
                className="mt-8 max-w-[58ch] text-lg leading-relaxed text-ink-soft"
              >
                {copy.sub}
              </p>

              <div data-rise="4" className="mt-10 flex flex-wrap gap-3">
                <Link
                  href={`/${m}/search`}
                  className="group inline-flex items-center gap-3 border border-ink bg-ink px-7 py-4 text-sm font-medium text-paper transition-colors hover:bg-brass hover:border-brass"
                >
                  Browse {MARKETS[m].label}
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    &rarr;
                  </span>
                </Link>
                <Link
                  href={`/${m}/guides`}
                  className="inline-flex items-center border border-line px-7 py-4 text-sm font-medium transition-colors hover:border-brass"
                >
                  Investor guides
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- inventory ---------- */}
        <section className="mx-auto max-w-[1400px] px-6 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
            <div>
              <p className="label">Selected inventory</p>
              <h2 className="mt-3 font-display text-4xl">Currently available</h2>
            </div>
            <Link href={`/${m}/search`} className="label hover:text-brass">
              View all &rarr;
            </Link>
          </div>

          <div
            data-reveal-group
            className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {listings.map((l, i) => (
              <ListingCard key={l.slug} listing={l} priority={i < 3} />
            ))}
          </div>
        </section>

        {/* ---------- area guides: entry point to the link mesh ---------- */}
        <Suspense fallback={null}>
          <AreaLinks market={m} />
        </Suspense>

        {/* ---------- the differentiator ---------- */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-[1400px] px-6 py-20">
            <div data-reveal-group className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
              <div>
                <p data-reveal className="label">
                  Why Lavion Luxe
                </p>
                <h2 data-reveal className="mt-3 font-display text-4xl leading-tight">
                  The rules, before the enquiry.
                </h2>
                <p data-reveal className="mt-5 max-w-[42ch] text-ink-soft">
                  Most portals leave ownership eligibility, tenure and
                  repatriation to a phone call. We compute them from the listing
                  and show you the answer on the page.
                </p>
              </div>

              <dl data-reveal-group className="grid gap-px bg-line sm:grid-cols-2">
                {[
                  {
                    k: "Permit-verified",
                    v: "Every Dubai listing carries a live DLD advertising permit number. Lapsed permits are withdrawn automatically.",
                  },
                  {
                    k: "Material Information",
                    v: "UK listings publish Parts A and B up front — tenure, council tax, lease years, service charge.",
                  },
                  {
                    k: "Eligibility computed",
                    v: "Golden Visa qualification and freehold-zone status are derived from the listing, not claimed in copy.",
                  },
                  {
                    k: "Sourced guidance",
                    v: "Every rule we publish carries its authority and the date it was last reviewed.",
                  },
                ].map((x) => (
                  <div key={x.k} data-reveal className="bg-paper p-7">
                    <dt className="label !text-brass">{x.k}</dt>
                    <dd className="mt-3 text-sm leading-relaxed text-ink-soft">{x.v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter market={m} />
    </>
  );
}

async function AreaLinks({ market }: { market: Market }) {
  const tax = await getAreaTaxonomy();
  const cities = tax.filter((t) => t.market === market && !t.localitySlug);
  if (!cities.length) return null;

  return (
    <section className="mx-auto max-w-[1400px] px-6 pb-8">
      <p className="label">Browse by area</p>
      <ul className="mt-5 flex flex-wrap gap-2">
        {cities.map((c) => (
          <li key={c.citySlug}>
            <Link
              href={`/${market}/for-sale/${c.citySlug}`}
              className="inline-flex items-center gap-2 border border-line bg-surface px-4 py-2.5 text-sm capitalize transition-colors hover:border-brass"
            >
              {c.citySlug.replace(/-/g, " ")}
              <span className="label tnum">{c.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
