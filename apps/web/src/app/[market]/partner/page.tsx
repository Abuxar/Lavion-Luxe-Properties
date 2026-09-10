import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MARKETS, PARTNER_SERVICE_LABEL, type Market } from "@lavion/schema";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { featuredPartner } from "@/lib/accounts";
import { BRAND_NAME } from "@/lib/brand";

const VALID: Market[] = ["uk", "ae", "pk"];

export function generateStaticParams() {
  return VALID.map((market) => ({ market }));
}

/**
 * Metadata deliberately does not read the partner record. It is mutable store
 * data, and reading it here would make the whole route request-time rather
 * than letting the shell prerender and the partner stream.
 */
export async function generateMetadata({ params }: PageProps<"/[market]/partner">) {
  const { market } = await params;
  const label = MARKETS[market as Market]?.label ?? "";
  return {
    title: "Featured partner",
    description: `Our featured partner for ${label} — buy, rent or build.`,
    alternates: { canonical: `/${market}/partner` },
  };
}

export default async function PartnerPage({ params }: PageProps<"/[market]/partner">) {
  const { market } = await params;
  if (!VALID.includes(market as Market)) notFound();
  const m = market as Market;

  return (
    <>
      <SiteHeader market={m} />
      <main className="flex-1">
        <Suspense fallback={<div className="p-12 label">Loading…</div>}>
          <Body market={m} />
        </Suspense>
      </main>
      <SiteFooter market={m} />
    </>
  );
}

async function Body({ market: m }: { market: Market }) {
  const partner = await featuredPartner(m);
  if (!partner) notFound();

  const services = partner.services ?? [];
  const q: Record<string, string> = {
    buy: "transaction=sale",
    rent: "transaction=rent",
    build: "transaction=build",
  };

  return (
    <>
        <div className="border-b border-line bg-surface">
          <div className="mx-auto max-w-[900px] px-6 py-14">
            <p className="label !text-brass">Featured partner</p>
            <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.4rem)] leading-tight">
              {partner.name}
            </h1>
            <div className="rule-brass mt-6 w-28" />
            {partner.tagline && (
              <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-ink-soft">
                {partner.tagline}
              </p>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-[900px] px-6 py-12">
          {partner.blurb && (
            <p className="max-w-[64ch] text-lg leading-relaxed">{partner.blurb}</p>
          )}

          {services.length > 0 && (
            <section className="mt-12">
              <h2 className="label">What they handle</h2>
              <ul className="mt-4 grid gap-px bg-line sm:grid-cols-3">
                {services.map((s) => (
                  <li key={s}>
                    <Link
                      href={`/${m}/search?${q[s]}`}
                      className="group block bg-paper p-6 transition-colors hover:bg-surface"
                    >
                      <span className="block font-display text-2xl group-hover:text-brass">
                        {PARTNER_SERVICE_LABEL[s]}
                      </span>
                      <span className="label mt-2 block">Browse {MARKETS[m].label} &rarr;</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Disclosure, in the same spirit as the Featured badge on listings. */}
          <aside className="mt-12 border border-line bg-surface p-6">
            <p className="label">Why this partner appears here</p>
            <p className="mt-3 max-w-[64ch] text-sm leading-relaxed text-ink-soft">
              {partner.name} is a featured partner on {BRAND_NAME}, which means
              their placement is a commercial relationship rather than a ranking
              earned by matching your search. Every listing they publish is held
              to the same disclosure rules as any other agency on this site.
            </p>
          </aside>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href={`/${m}/search`}
              className="bg-ink px-7 py-4 text-sm font-medium text-paper transition-colors hover:bg-brass"
            >
              Browse all {MARKETS[m].label}
            </Link>
            <Link
              href={`/${m}/valuation`}
              className="border border-line px-7 py-4 text-sm font-medium transition-colors hover:border-brass"
            >
              Request a valuation
            </Link>
          </div>
        </div>
    </>
  );
}
