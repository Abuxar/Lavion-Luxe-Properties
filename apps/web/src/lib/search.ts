import { PROMOTION_WEIGHT, isPromotionLive, type Market } from "@lavion/schema";
import type { ListingSummary } from "./listings";

/**
 * One query model, shared by the search page and by saved searches.
 *
 * Parsing, filtering and serialising all live here so a saved search matches
 * exactly what the user saw when they saved it. If the search page and the
 * alert matcher each grew their own filter logic they would drift, and a
 * subscriber would be alerted about properties their search would not return.
 */

export interface SearchQuery {
  transaction?: "sale" | "rent";
  city?: string;
  locality?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  offPlan?: boolean;
  goldenVisaEligible?: boolean;
  sort: SortKey;
  page: number;
}

export type SortKey = "newest" | "price_asc" | "price_desc" | "beds_desc" | "size_desc";

export const SORTS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "beds_desc", label: "Most bedrooms" },
  { value: "size_desc", label: "Largest first" },
];

export const PER_PAGE = 12;

type Raw = Record<string, string | string[] | undefined>;

function one(sp: Raw, k: string): string | undefined {
  const v = sp[k];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() !== "" ? s.trim() : undefined;
}

function num(sp: Raw, k: string): number | undefined {
  const v = one(sp, k);
  if (v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseQuery(sp: Raw): SearchQuery {
  const t = one(sp, "transaction");
  const sort = (SORTS.find((s) => s.value === one(sp, "sort"))?.value ?? "newest") as SortKey;
  return {
    transaction: t === "sale" || t === "rent" ? t : undefined,
    city: one(sp, "city"),
    locality: one(sp, "locality"),
    category: one(sp, "category"),
    minPrice: num(sp, "minPrice"),
    maxPrice: num(sp, "maxPrice"),
    minBeds: num(sp, "minBeds"),
    maxBeds: num(sp, "maxBeds"),
    minBaths: num(sp, "minBaths"),
    offPlan: one(sp, "offPlan") === "true" ? true : undefined,
    goldenVisaEligible: one(sp, "goldenVisaEligible") === "true" ? true : undefined,
    sort,
    page: Math.max(1, num(sp, "page") ?? 1),
  };
}

/** Serialises back to a query string, omitting defaults so URLs stay clean. */
export function toSearchParams(q: Partial<SearchQuery>): string {
  const p = new URLSearchParams();
  const set = (k: string, v: unknown) => {
    if (v === undefined || v === null || v === "" || v === false) return;
    p.set(k, String(v));
  };
  set("transaction", q.transaction);
  set("city", q.city);
  set("locality", q.locality);
  set("category", q.category);
  set("minPrice", q.minPrice);
  set("maxPrice", q.maxPrice);
  set("minBeds", q.minBeds);
  set("maxBeds", q.maxBeds);
  set("minBaths", q.minBaths);
  set("offPlan", q.offPlan);
  set("goldenVisaEligible", q.goldenVisaEligible);
  if (q.sort && q.sort !== "newest") set("sort", q.sort);
  if (q.page && q.page > 1) set("page", q.page);
  return p.toString();
}

export function isFiltered(q: SearchQuery): boolean {
  return Boolean(
    q.transaction ||
      q.city ||
      q.locality ||
      q.category ||
      q.minPrice ||
      q.maxPrice ||
      q.minBeds ||
      q.maxBeds ||
      q.minBaths ||
      q.offPlan ||
      q.goldenVisaEligible,
  );
}

const norm = (s: string) => s.trim().toLowerCase();

/** The single predicate. Both search results and alert matching call this. */
export function matches(l: ListingSummary, q: SearchQuery): boolean {
  if (q.transaction && l.transaction !== q.transaction) return false;
  if (q.city && norm(l.location.city) !== norm(q.city)) return false;
  if (q.locality && norm(l.location.locality) !== norm(q.locality)) return false;
  if (q.category && l.category !== q.category) return false;
  if (q.minPrice !== undefined && l.price.amount < q.minPrice) return false;
  if (q.maxPrice !== undefined && l.price.amount > q.maxPrice) return false;
  if (q.minBeds !== undefined && (l.bedrooms ?? 0) < q.minBeds) return false;
  if (q.maxBeds !== undefined && (l.bedrooms ?? 0) > q.maxBeds) return false;
  if (q.minBaths !== undefined && (l.bathrooms ?? 0) < q.minBaths) return false;
  if (q.offPlan && !l.offPlan) return false;

  // Computed from listing data, never a hand-applied tag.
  if (q.goldenVisaEligible) {
    if (l.tenure !== "freehold") return false;
    if (l.location.freeholdZone !== true) return false;
    if (l.price.currency !== "AED" || l.price.amount < 2_000_000) return false;
  }
  return true;
}

/** Live promotion weight, or 0. Expired and future promotions do not boost. */
export function promotionWeight(l: ListingSummary): number {
  if (!l.promotion) return 0;
  const p = {
    ...l.promotion,
    startsAt: new Date(l.promotion.startsAt),
    expiresAt: new Date(l.promotion.expiresAt),
  };
  return isPromotionLive(p as never) ? PROMOTION_WEIGHT[l.promotion.tier] : 0;
}

export function sortListings(rows: ListingSummary[], sort: SortKey): ListingSummary[] {
  const out = [...rows];

  // Paid placement lifts a listing in the DEFAULT order only. Once someone has
  // explicitly asked for cheapest-first, quietly reordering that for money is
  // the deceptive pattern regulators and users both object to — their sort
  // wins, and the Featured badge still discloses the promotion either way.
  if (sort === "newest") {
    return out.sort((a, b) => {
      const w = promotionWeight(b) - promotionWeight(a);
      if (w !== 0) return w;
      return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
    });
  }

  switch (sort) {
    case "price_asc":
      return out.sort((a, b) => a.price.amount - b.price.amount);
    case "price_desc":
      return out.sort((a, b) => b.price.amount - a.price.amount);
    case "beds_desc":
      return out.sort((a, b) => (b.bedrooms ?? 0) - (a.bedrooms ?? 0));
    case "size_desc":
      return out.sort((a, b) => b.area.canonicalSqft - a.area.canonicalSqft);
    default:
      return out.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  }
}

export function runSearch(
  rows: ListingSummary[],
  q: SearchQuery,
): { items: ListingSummary[]; total: number; pages: number; page: number } {
  const hits = sortListings(rows.filter((l) => matches(l, q)), q.sort);
  const pages = Math.max(1, Math.ceil(hits.length / PER_PAGE));
  const page = Math.min(q.page, pages);
  return {
    items: hits.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    total: hits.length,
    pages,
    page,
  };
}

/** Facet options derived from live inventory, so filters never offer a dead end. */
export function facetsFor(rows: ListingSummary[]) {
  const cities = new Map<string, number>();
  const localities = new Map<string, number>();
  const categories = new Map<string, number>();
  for (const l of rows) {
    cities.set(l.location.city, (cities.get(l.location.city) ?? 0) + 1);
    localities.set(l.location.locality, (localities.get(l.location.locality) ?? 0) + 1);
    categories.set(l.category, (categories.get(l.category) ?? 0) + 1);
  }
  const sorted = (m: Map<string, number>) =>
    [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  return { cities: sorted(cities), localities: sorted(localities), categories: sorted(categories) };
}

/** Human summary of a query — used in the saved-search list and the admin view. */
export function describeQuery(q: SearchQuery, market: Market): string {
  const bits: string[] = [];
  if (q.minBeds) bits.push(`${q.minBeds}+ bed`);
  if (q.category) bits.push(q.category);
  bits.push(q.transaction === "rent" ? "to rent" : "for sale");
  if (q.locality) bits.push(`in ${q.locality}`);
  else if (q.city) bits.push(`in ${q.city}`);
  else bits.push(`in ${market.toUpperCase()}`);
  if (q.maxPrice) bits.push(`under ${q.maxPrice.toLocaleString()}`);
  if (q.minPrice && !q.maxPrice) bits.push(`over ${q.minPrice.toLocaleString()}`);
  if (q.goldenVisaEligible) bits.push("· Golden Visa eligible");
  if (q.offPlan) bits.push("· off-plan");
  return bits.join(" ");
}
