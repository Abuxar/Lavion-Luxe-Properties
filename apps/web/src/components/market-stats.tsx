import Link from "next/link";
import { MARKETS, type Market } from "@lavion/schema";
import { formatPrice } from "@/lib/format";
import { getListings } from "@/lib/listings";

/**
 * What is actually in this market, immediately under the hero.
 *
 * A full-viewport hero states a proposition and then hands the visitor
 * nothing concrete. This is the answer to "so what have you got" — real counts
 * and a real price range, derived from inventory rather than written as copy
 * that would go stale the day a listing sells.
 *
 * Each figure is a link, so the strip is navigation rather than decoration.
 */
export async function MarketStats({ market }: { market: Market }) {
  const listings = await getListings(market);
  if (!listings.length) return null;

  const prices = listings.map((l) => l.price.amount);
  const areas = new Set(listings.map((l) => l.location.locality));
  const buildable = listings.filter((l) => l.transaction === "build").length;
  const currency = listings[0].price.currency;

  const stats: { k: string; v: string; href: string }[] = [
    {
      k: "Available now",
      v: String(listings.length),
      href: `/${market}/search`,
    },
    {
      k: "From",
      v: formatPrice(Math.min(...prices), currency, market, { compact: true }),
      href: `/${market}/search?sort=price_asc`,
    },
    {
      k: "Up to",
      v: formatPrice(Math.max(...prices), currency, market, { compact: true }),
      href: `/${market}/search?sort=price_desc`,
    },
    {
      k: areas.size === 1 ? "Area" : "Areas covered",
      v: String(areas.size),
      href: `/${market}/search`,
    },
  ];

  // Only advertise build where there is something to build on.
  if (buildable > 0) {
    stats.push({
      k: "Plots to build",
      v: String(buildable),
      href: `/${market}/search?transaction=build`,
    });
  }

  return (
    <section
      id="overview"
      className="scroll-mt-[var(--header-h,4.25rem)] border-b border-line bg-surface"
      aria-label={`${MARKETS[market].label} at a glance`}
    >
      <dl className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px bg-line sm:grid-cols-4 lg:grid-cols-5">
        {stats.map((s) => (
          <Link
            key={s.k}
            href={s.href}
            className="group bg-surface px-6 py-7 transition-colors hover:bg-paper"
          >
            <dt className="label">{s.k}</dt>
            <dd className="mt-2 font-display text-[clamp(1.6rem,2.4vw,2.2rem)] leading-none tnum transition-colors group-hover:text-brass">
              {s.v}
            </dd>
          </Link>
        ))}
      </dl>
    </section>
  );
}
