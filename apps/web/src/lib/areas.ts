import { cacheLife, cacheTag } from "next/cache";
import { MARKETS, fromSqft, type Market } from "@lavion/schema";
import { getListings, type ListingSummary } from "./listings";

/**
 * F03 — programmatic area guides.
 *
 * Portals rank on intent combinations, not on their homepage: "apartments for
 * sale in Dubai Marina", "flats for sale in Chelsea". This derives that page
 * set from live inventory rather than from a hand-maintained list, so a guide
 * exists exactly while there is something to show on it.
 *
 * The counterweight is §8 of the plan: the same generator that creates the
 * growth engine can create hundreds of thousands of near-empty URLs. Hence
 * `isIndexable` — a guide earns indexation by holding real inventory, and
 * everything below the threshold is rendered but marked noindex,follow so the
 * links are still crawled while the thin page stays out of the index.
 */

/**
 * Minimum live listings before a guide may be indexed.
 *
 * Deliberately low here because the seed inventory is small. Raise it as
 * supply grows — a real portal wants this in the 5–10 range, and the number
 * should be reviewed rather than left at whatever made the demo look full.
 */
export const MIN_LISTINGS_FOR_INDEX = 2;

export interface AreaStats {
  count: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  currency: string;
  /** Median price per sq ft — the number buyers actually compare areas on. */
  medianPerSqft: number;
  beds: number[];
  categories: { name: string; count: number }[];
}

export interface AreaGuide {
  market: Market;
  city: string;
  citySlug: string;
  locality?: string;
  localitySlug?: string;
  listings: ListingSummary[];
  stats: AreaStats;
  indexable: boolean;
  /** Sibling areas in the same city, for the internal-link mesh. */
  siblings: { name: string; slug: string; count: number }[];
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function statsFor(listings: ListingSummary[], market: Market): AreaStats {
  const prices = listings.map((l) => l.price.amount);
  const perSqft = listings
    .filter((l) => l.area.canonicalSqft > 0)
    .map((l) => l.price.amount / l.area.canonicalSqft);

  const catCount = new Map<string, number>();
  for (const l of listings) catCount.set(l.category, (catCount.get(l.category) ?? 0) + 1);

  return {
    count: listings.length,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    medianPrice: median(prices),
    currency: listings[0]?.price.currency ?? MARKETS[market].currency,
    medianPerSqft: Math.round(median(perSqft.map((x) => Math.round(x)))),
    beds: [...new Set(listings.map((l) => l.bedrooms).filter((b): b is number => b !== undefined))].sort(
      (a, b) => a - b,
    ),
    categories: [...catCount.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** Every city/locality pair that currently has inventory, for route generation. */
export async function getAreaTaxonomy(): Promise<
  { market: Market; citySlug: string; localitySlug?: string; count: number }[]
> {
  "use cache";
  cacheLife("areaGuide");
  cacheTag("listings");

  const out: { market: Market; citySlug: string; localitySlug?: string; count: number }[] = [];

  for (const market of ["uk", "ae", "pk"] as Market[]) {
    const listings = await getListings(market);

    const byCity = new Map<string, ListingSummary[]>();
    for (const l of listings) {
      const k = slugify(l.location.city);
      byCity.set(k, [...(byCity.get(k) ?? []), l]);
    }

    for (const [citySlug, cityListings] of byCity) {
      out.push({ market, citySlug, count: cityListings.length });

      const byLocality = new Map<string, number>();
      for (const l of cityListings) {
        const k = slugify(l.location.locality);
        byLocality.set(k, (byLocality.get(k) ?? 0) + 1);
      }
      for (const [localitySlug, count] of byLocality) {
        out.push({ market, citySlug, localitySlug, count });
      }
    }
  }

  return out;
}

export async function getAreaGuide(
  market: Market,
  citySlug: string,
  localitySlug?: string,
): Promise<AreaGuide | null> {
  "use cache";
  cacheLife("areaGuide");
  cacheTag("listings");

  const all = await getListings(market);
  const cityListings = all.filter((l) => slugify(l.location.city) === citySlug);
  if (!cityListings.length) return null;

  const city = cityListings[0].location.city;

  const listings = localitySlug
    ? cityListings.filter((l) => slugify(l.location.locality) === localitySlug)
    : cityListings;
  if (!listings.length) return null;

  const locality = localitySlug ? listings[0].location.locality : undefined;

  // Sibling areas power the internal-link mesh: parent city -> areas, and
  // area -> neighbouring areas. Internal linking is most of what makes a
  // programmatic page set rank rather than sit orphaned.
  const sibMap = new Map<string, { name: string; count: number }>();
  for (const l of cityListings) {
    const slug = slugify(l.location.locality);
    if (slug === localitySlug) continue;
    const prev = sibMap.get(slug);
    sibMap.set(slug, { name: l.location.locality, count: (prev?.count ?? 0) + 1 });
  }

  return {
    market,
    city,
    citySlug,
    locality,
    localitySlug,
    listings,
    stats: statsFor(listings, market),
    indexable: listings.length >= MIN_LISTINGS_FOR_INDEX,
    siblings: [...sibMap.entries()]
      .map(([slug, v]) => ({ slug, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
  };
}

/**
 * Sold and let listings keep their URL and their accumulated authority, so a
 * visitor who lands on one is offered live alternatives instead of a dead end.
 */
export async function getSimilarListings(
  market: Market,
  listing: { slug: string; location: { city: string; locality: string }; bedrooms?: number },
  limit = 3,
): Promise<ListingSummary[]> {
  "use cache";
  cacheLife("search");
  cacheTag("listings");

  const all = await getListings(market);
  const others = all.filter((l) => l.slug !== listing.slug && l.status === "published");

  const score = (l: ListingSummary) =>
    (l.location.locality === listing.location.locality ? 4 : 0) +
    (l.location.city === listing.location.city ? 2 : 0) +
    (l.bedrooms !== undefined && l.bedrooms === listing.bedrooms ? 1 : 0);

  return others
    .map((l) => ({ l, s: score(l) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.l);
}

/** Human-readable area size, in the market's own convention. */
export function areaLabel(canonicalSqft: number, market: Market): string {
  const unit = MARKETS[market].displayUnit;
  if (unit === "marla") {
    const v = fromSqft(canonicalSqft, "marla");
    return v >= 20 ? "Kanal" : "Marla";
  }
  return "sq ft";
}
