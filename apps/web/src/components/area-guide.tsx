import Link from "next/link";
import type { Market } from "@lavion/schema";
import { MARKETS } from "@lavion/schema";
import { ListingCard } from "@/components/listing-card";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { formatArea, formatPrice } from "@/lib/format";
import { areaLabel, type AreaGuide } from "@/lib/areas";

/**
 * The guide body, shared by the city and locality routes.
 *
 * Every page carries real substance — live inventory, price statistics derived
 * from it, and links onward. A programmatic page with nothing but a heading
 * and a listing grid is the thin content that gets a page set demoted; the
 * stats and the internal-link mesh are what make it worth indexing.
 */
export function AreaGuideView({ guide }: { guide: AreaGuide }) {
  const { market, city, citySlug, locality, stats, listings, siblings } = guide;
  const m = market as Market;
  const place = locality ?? city;
  const scope = locality ? `${locality}, ${city}` : city;

  return (
    <>
      <SiteHeader market={m} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: MARKETS[m].label, item: `/${m}` },
              {
                "@type": "ListItem",
                position: 2,
                name: city,
                item: `/${m}/for-sale/${citySlug}`,
              },
              ...(locality
                ? [{ "@type": "ListItem", position: 3, name: locality }]
                : []),
            ],
          }),
        }}
      />

      <main className="flex-1">
        <div className="border-b border-line bg-surface">
          <div className="mx-auto max-w-[1400px] px-6 py-12">
            <nav aria-label="Breadcrumb" className="label">
              <Link href={`/${m}`} className="hover:text-brass">
                {MARKETS[m].label}
              </Link>
              <span className="mx-2 text-line-strong">/</span>
              {locality ? (
                <>
                  <Link href={`/${m}/for-sale/${citySlug}`} className="hover:text-brass">
                    {city}
                  </Link>
                  <span className="mx-2 text-line-strong">/</span>
                  <span className="text-ink-soft">{locality}</span>
                </>
              ) : (
                <span className="text-ink-soft">{city}</span>
              )}
            </nav>

            <h1 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.08]">
              Property for sale in {place}
            </h1>
            <div className="rule-brass mt-6 w-32" />
            <p className="mt-6 max-w-[62ch] leading-relaxed text-ink-soft">
              {stats.count} {stats.count === 1 ? "property" : "properties"} currently
              available in {scope}, from{" "}
              {formatPrice(stats.minPrice, stats.currency, m, { compact: true })} to{" "}
              {formatPrice(stats.maxPrice, stats.currency, m, { compact: true })}.
              {stats.medianPerSqft > 0 && (
                <>
                  {" "}
                  The median asking price works out at{" "}
                  {formatPrice(stats.medianPerSqft, stats.currency, m)} per{" "}
                  {areaLabel(1, m) === "sq ft" ? "sq ft" : "sq ft"}.
                </>
              )}
            </p>
          </div>
        </div>

        {/* ---- price statistics ---- */}
        <section className="mx-auto max-w-[1400px] px-6 py-10">
          <h2 className="label">Asking prices in {place}</h2>
          <dl className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            <Stat k="Median" v={formatPrice(stats.medianPrice, stats.currency, m, { compact: true })} accent />
            <Stat k="Lowest" v={formatPrice(stats.minPrice, stats.currency, m, { compact: true })} />
            <Stat k="Highest" v={formatPrice(stats.maxPrice, stats.currency, m, { compact: true })} />
            <Stat
              k={`Median per ${areaLabel(1, m)}`}
              v={stats.medianPerSqft ? formatPrice(stats.medianPerSqft, stats.currency, m) : "—"}
            />
          </dl>

          {stats.categories.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="label">Available:</span>
              {stats.categories.map((c) => (
                <span key={c.name} className="label border border-line px-3 py-1.5 capitalize">
                  {c.count} {c.name}
                  {c.count > 1 ? "s" : ""}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ---- inventory ---- */}
        <section className="mx-auto max-w-[1400px] px-6 pb-10">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l, i) => (
              <ListingCard key={l.slug} listing={l} priority={i < 3} />
            ))}
          </div>
        </section>

        {/* ---- internal link mesh ---- */}
        {siblings.length > 0 && (
          <section className="border-t border-line bg-surface">
            <div className="mx-auto max-w-[1400px] px-6 py-12">
              <h2 className="label">
                {locality ? `Other areas in ${city}` : `Areas in ${city}`}
              </h2>
              <ul className="mt-5 flex flex-wrap gap-2">
                {siblings.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={`/${m}/for-sale/${citySlug}/${s.slug}`}
                      className="inline-flex items-center gap-2 border border-line bg-paper px-4 py-2.5 text-sm transition-colors hover:border-brass"
                    >
                      {s.name}
                      <span className="label tnum">{s.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>

              {locality && (
                <Link
                  href={`/${m}/for-sale/${citySlug}`}
                  className="label mt-6 inline-block hover:text-brass"
                >
                  All property in {city} &rarr;
                </Link>
              )}
            </div>
          </section>
        )}

        {/* ---- investor context, market-specific ---- */}
        <section className="mx-auto max-w-[1400px] px-6 py-12">
          <h2 className="label">Buying in {MARKETS[m].label}</h2>
          <p className="mt-4 max-w-[62ch] leading-relaxed text-ink-soft">
            {m === "ae" &&
              "Foreign nationals may own freehold property in designated areas only. Freehold property at or above AED 2,000,000 opens the ten-year Golden Visa route — eligibility is flagged on each listing that qualifies."}
            {m === "uk" &&
              "Every listing publishes its Material Information up front — tenure, council tax band, and for leasehold the years remaining, service charge and ground rent. Overseas companies buying UK property must register with Companies House."}
            {m === "pk" &&
              "Overseas Pakistanis buying through a Roshan Digital Account get a State Bank guaranteed right of repatriation, and can pay advance tax at filer rates under sections 236C and 236K without being on the Active Taxpayer List."}
          </p>
          <Link href={`/${m}/guides`} className="label mt-5 inline-block hover:text-brass">
            Read the {MARKETS[m].label} guide &rarr;
          </Link>
        </section>
      </main>

      <SiteFooter market={m} />
    </>
  );
}

function Stat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="bg-paper p-5">
      <dt className="label">{k}</dt>
      <dd
        className="mt-2 font-display text-2xl tnum"
        style={{ color: accent ? "var(--color-brass)" : "var(--color-ink)" }}
      >
        {v}
      </dd>
    </div>
  );
}
