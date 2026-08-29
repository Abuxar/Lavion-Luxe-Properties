"use client";

import Image from "next/image";
import Link from "next/link";
import { MARKETS, fromSqft, type Market } from "@lavion/schema";
import { useShortlist } from "@/components/shortlist";

/**
 * Saved properties, with a side-by-side comparison.
 *
 * Comparison is the point: a shortlist that only lists is a bookmark folder.
 * Price per sq ft is computed here because it is the number that actually
 * separates two properties at similar asking prices, and no listing states it.
 */
export function ShortlistView({ market }: { market: Market }) {
  const { items, remove, clear, ready } = useShortlist();

  if (!ready) {
    return (
      <div aria-hidden className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-line bg-surface">
            <div className="aspect-[4/3] animate-pulse bg-surface-2" />
            <div className="h-28 p-5" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border border-line bg-surface p-16 text-center">
        <p className="font-display text-2xl">Nothing saved yet</p>
        <p className="mx-auto mt-3 max-w-[46ch] text-sm text-ink-soft">
          Tap the heart on any property to save it here. Saved properties stay in
          this browser, so you can come back and compare without an account.
        </p>
        <Link href={`/${market}/search`} className="label mt-6 inline-block hover:text-brass">
          Browse {MARKETS[market].label} &rarr;
        </Link>
      </div>
    );
  }

  const fmt = (n: number, cur: string, m: string) =>
    new Intl.NumberFormat(MARKETS[m as Market]?.locale ?? "en-GB", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(n);

  const area = (sqft: number, m: string) => {
    const unit = MARKETS[m as Market]?.displayUnit ?? "sqft";
    if (unit === "marla") {
      const v = fromSqft(sqft, "marla");
      return v >= 20
        ? `${fromSqft(sqft, "kanal").toFixed(1)} Kanal`
        : `${v.toFixed(1)} Marla`;
    }
    return `${Math.round(sqft).toLocaleString()} sq ft`;
  };

  const cheapestPerSqft = Math.min(
    ...items.filter((i) => i.sqft > 0).map((i) => i.price / i.sqft),
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="label tnum">
          {items.length} saved {items.length === 1 ? "property" : "properties"}
        </p>
        <button
          type="button"
          onClick={clear}
          className="label border border-line px-4 py-2 transition-colors hover:border-signal"
        >
          Clear all
        </button>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <article key={i.slug} className="relative flex flex-col border border-line bg-surface">
            <Link href={`/${i.market}/property/${i.slug}`} className="absolute inset-0 z-10">
              <span className="sr-only">{i.title}</span>
            </Link>

            <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
              {i.image && (
                <Image src={i.image} alt={i.title} fill sizes="33vw" className="object-cover" />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  remove(i.slug);
                }}
                aria-label={`Remove ${i.title}`}
                className="label absolute right-3 top-3 z-20 border border-paper/40 bg-ink/60 px-2.5 py-1.5 !text-paper backdrop-blur-sm transition-colors hover:border-signal"
              >
                Remove
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-5">
              <p className="font-display text-2xl tnum">{fmt(i.price, i.currency, i.market)}</p>
              <p className="text-[15px] font-medium leading-snug">{i.title}</p>
              <p className="label !normal-case !tracking-normal">
                {i.locality}, {i.city}
              </p>
            </div>
          </article>
        ))}
      </div>

      {items.length > 1 && (
        <section className="mt-14">
          <h2 className="label">Side by side</h2>
          <div className="mt-4 overflow-x-auto border border-line">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-surface">
                  <th className="label px-4 py-3 text-left">Property</th>
                  <th className="label px-4 py-3 text-left">Price</th>
                  <th className="label px-4 py-3 text-left">Beds</th>
                  <th className="label px-4 py-3 text-left">Baths</th>
                  <th className="label px-4 py-3 text-left">Size</th>
                  <th className="label px-4 py-3 text-left">Per sq ft</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const perSqft = i.sqft > 0 ? i.price / i.sqft : 0;
                  const best = perSqft > 0 && perSqft === cheapestPerSqft;
                  return (
                    <tr key={i.slug} className="border-t border-line">
                      <td className="px-4 py-3">
                        <Link
                          href={`/${i.market}/property/${i.slug}`}
                          className="border-b border-brass/40 hover:border-brass"
                        >
                          {i.title.slice(0, 42)}
                        </Link>
                        <span className="label ml-2">{i.market.toUpperCase()}</span>
                      </td>
                      <td className="px-4 py-3 tnum">{fmt(i.price, i.currency, i.market)}</td>
                      <td className="px-4 py-3 tnum">{i.bedrooms ?? "—"}</td>
                      <td className="px-4 py-3 tnum">{i.bathrooms ?? "—"}</td>
                      <td className="px-4 py-3 tnum">{area(i.sqft, i.market)}</td>
                      <td className="px-4 py-3 tnum">
                        {perSqft > 0 ? (
                          <span style={{ color: best ? "var(--color-brass)" : undefined }}>
                            {fmt(Math.round(perSqft), i.currency, i.market)}
                            {best && <span className="label ml-2">best value</span>}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            Price per sq ft is comparable within a market. Across markets it is
            not — currencies and conventions differ.
          </p>
        </section>
      )}
    </>
  );
}
