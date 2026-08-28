import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MARKETS, type Market } from "@lavion/schema";
import { ListingCard } from "@/components/listing-card";
import { LegalDisclaimer } from "@/components/legal-disclaimer";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { allGuideParams, getGuide, type GuideWithRules } from "@/lib/guides";
import { getListings } from "@/lib/listings";

const VALID: Market[] = ["uk", "ae", "pk"];

export async function generateStaticParams() {
  return allGuideParams();
}

export async function generateMetadata({ params }: PageProps<"/[market]/guides/[slug]">) {
  const { market, slug } = await params;
  const guide = await getGuide(market as Market, slug);
  if (!guide) return { title: "Guide not found" };

  return {
    title: guide.title,
    description: guide.standfirst,
    alternates: { canonical: `/${market}/guides/${slug}` },
    openGraph: { title: guide.title, description: guide.standfirst, type: "article" },
  };
}

export default async function GuidePage({ params }: PageProps<"/[market]/guides/[slug]">) {
  const { market, slug } = await params;
  if (!VALID.includes(market as Market)) notFound();
  const m = market as Market;

  const guide = await getGuide(m, slug);
  if (!guide) notFound();

  return (
    <>
      <SiteHeader market={m} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: guide.title,
            description: guide.standfirst,
            dateModified: guide.lastReviewedAt.toISOString(),
            about: guide.rules.map((r) => r.title),
            citation: guide.rules.map((r) => ({
              "@type": "CreativeWork",
              name: r.source.authority,
              url: r.source.url,
            })),
          }),
        }}
      />

      <main className="flex-1">
        <article className="mx-auto max-w-[1000px] px-6 py-12">
          <nav aria-label="Breadcrumb" className="label">
            <Link href={`/${m}`} className="hover:text-brass">
              {MARKETS[m].label}
            </Link>
            <span className="mx-2 text-line-strong">/</span>
            <Link href={`/${m}/guides`} className="hover:text-brass">
              Guides
            </Link>
          </nav>

          <header className="mt-6 border-b border-line pb-8">
            <h1 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.1]">
              {guide.title}
            </h1>
            <div className="rule-brass mt-6 w-28" />
            <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-ink-soft">
              {guide.standfirst}
            </p>
            <p className="label mt-6">
              For {guide.audience} · Last reviewed{" "}
              {guide.lastReviewedAt.toISOString().slice(0, 10)}
            </p>
          </header>

          {/* Staleness is surfaced, not hidden. Undated legal content is worse
              than none, and content past its review date is worse again. */}
          {guide.needsReview && (
            <div className="mt-8 border border-ochre/50 bg-ochre-wash p-5">
              <p className="label" style={{ color: "var(--color-ochre)" }}>
                Due for review
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                At least one rule on this page is past its review interval.
                Treat the detail as indicative and confirm before relying on it.
              </p>
            </div>
          )}

          <p className="mt-10 max-w-[65ch] text-lg leading-relaxed">{guide.intro}</p>

          {/* ---- the rules, rendered from data ---- */}
          <section className="mt-12">
            <h2 className="label">What the rules say</h2>
            <div className="mt-5 flex flex-col gap-px bg-line">
              {guide.rules.map((r) => (
                <div key={r.key} className="bg-paper p-7">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="font-display text-2xl">{r.title}</h3>
                    {r.stale && (
                      <span
                        className="label border px-2 py-1"
                        style={{
                          color: "var(--color-ochre)",
                          borderColor: "color-mix(in srgb, var(--color-ochre) 40%, transparent)",
                        }}
                      >
                        Due for review
                      </span>
                    )}
                  </div>

                  <p className="mt-4 max-w-[64ch] leading-relaxed text-ink-soft">{r.summary}</p>

                  <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3 border-t border-line pt-4">
                    <div>
                      <dt className="label">Authority</dt>
                      <dd className="mt-1 text-sm">
                        <a
                          href={r.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border-b border-brass/40 hover:border-brass"
                        >
                          {r.source.authority}
                        </a>
                      </dd>
                    </div>
                    <div>
                      <dt className="label">In force since</dt>
                      <dd className="mt-1 text-sm tnum">
                        {r.effectiveFrom.toISOString().slice(0, 10)}
                      </dd>
                    </div>
                    <div>
                      <dt className="label">Last reviewed</dt>
                      <dd className="mt-1 text-sm tnum">
                        {r.lastReviewedAt.toISOString().slice(0, 10)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </section>

          {/* ---- F04: the rule made actionable against real inventory ---- */}
          {guide.qualifier === "golden_visa" && (
            <Suspense fallback={null}>
              <QualifyingListings market={m} guide={guide} />
            </Suspense>
          )}

          <LegalDisclaimer market={m} />

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href={`/${m}/search`}
              className="bg-ink px-7 py-4 text-sm font-medium text-paper transition-colors hover:bg-brass"
            >
              Browse {MARKETS[m].label}
            </Link>
            <Link
              href={`/${m}/guides`}
              className="border border-line px-7 py-4 text-sm font-medium transition-colors hover:border-brass"
            >
              All guides
            </Link>
          </div>
        </article>
      </main>

      <SiteFooter market={m} />
    </>
  );
}

/**
 * This is what turns F04 from an article into a product feature: the Golden
 * Visa threshold is computable from data we already hold, so the guide can show
 * exactly which listings clear it rather than describing the rule in the
 * abstract and leaving the reader to work it out.
 */
async function QualifyingListings({
  market,
  guide,
}: {
  market: Market;
  guide: GuideWithRules;
}) {
  const rule = guide.rules.find((r) => r.key === "ae.golden_visa.property");
  const threshold = Number(rule?.params.thresholdAmount ?? 2_000_000);

  const all = await getListings(market);
  const qualifying = all.filter(
    (l) =>
      l.tenure === "freehold" &&
      l.location.freeholdZone === true &&
      l.price.currency === "AED" &&
      l.price.amount >= threshold,
  );

  return (
    <section className="mt-14 border-t border-line pt-10">
      <h2 className="label">Listings that qualify today</h2>
      <p className="mt-3 max-w-[60ch] text-ink-soft">
        {qualifying.length > 0
          ? `${qualifying.length} ${qualifying.length === 1 ? "property" : "properties"} on this site currently meet the threshold — freehold, in a designated zone, at or above AED ${threshold.toLocaleString()}.`
          : "No listing currently on the site meets the threshold on its own. Multiple properties can be combined to reach it."}
      </p>

      {qualifying.length > 0 && (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {qualifying.slice(0, 3).map((l) => (
            <ListingCard key={l.slug} listing={l} />
          ))}
        </div>
      )}

      <Link
        href={`/${market}/search?goldenVisaEligible=true`}
        className="label mt-6 inline-block hover:text-brass"
      >
        See every qualifying property &rarr;
      </Link>
    </section>
  );
}
