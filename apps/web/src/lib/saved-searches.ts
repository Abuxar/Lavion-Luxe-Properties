import "server-only";
import type { Market } from "@lavion/schema";
import { createBlobCollection } from "./blob-collection";
import { getListings } from "./listings";
import { matches, type SearchQuery } from "./search";

/**
 * F01 — saved searches.
 *
 * SCOPE, STATED PLAINLY: this stores the subscription and computes matches.
 * It does NOT send email — that needs a provider and a scheduler, neither of
 * which exists yet. Rather than build a queue that silently sends nothing, the
 * matches are surfaced in the admin view so the team can act on them by hand
 * today. Adding dispatch later is then a layer on top, not a rewrite.
 *
 * Matching calls the same `matches()` predicate the search page uses, so a
 * subscriber is never alerted about a property their own search would exclude.
 */

export interface SavedSearch {
  id: string;
  createdAt: string;
  market: Market;
  email: string;
  name?: string;
  /** Serialised so it survives JSON without losing shape. */
  query: SearchQuery;
  label: string;
  /** Slugs already seen, so "new since you subscribed" is meaningful. */
  seenSlugs: string[];
  lastCheckedAt?: string;
  active: boolean;
}

const store = createBlobCollection<SavedSearch>({
  key: "queue/saved-searches.json",
  seed: [],
});

function nextId(rows: SavedSearch[]): string {
  const max = rows.reduce((acc, r) => {
    const n = Number(r.id.replace("ss_", ""));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `ss_${String(max + 1).padStart(3, "0")}`;
}

export async function saveSearch(input: {
  market: Market;
  email: string;
  name?: string;
  query: SearchQuery;
  label: string;
}): Promise<{ saved: SavedSearch; duplicate: boolean }> {
  const rows = await store.all();

  // Same person, same query — don't create a second subscription.
  const existing = rows.find(
    (r) =>
      r.email.toLowerCase() === input.email.toLowerCase() &&
      r.market === input.market &&
      JSON.stringify(r.query) === JSON.stringify(input.query),
  );
  if (existing) return { saved: existing, duplicate: true };

  // Everything already listed counts as seen, so the first alert is genuinely
  // "new since you subscribed" rather than a dump of the whole catalogue.
  const current = await getListings(input.market);
  const seenSlugs = current.filter((l) => matches(l, input.query)).map((l) => l.slug);

  const saved: SavedSearch = {
    id: nextId(rows),
    createdAt: new Date().toISOString(),
    market: input.market,
    email: input.email,
    name: input.name,
    query: input.query,
    label: input.label,
    seenSlugs,
    active: true,
  };

  await store.replace([...rows, saved]);
  return { saved, duplicate: false };
}

export async function listSavedSearches(): Promise<SavedSearch[]> {
  const rows = await store.all();
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function setSavedSearchActive(id: string, active: boolean) {
  return store.update((r) => r.id === id, (r) => ({ ...r, active }));
}

export interface SavedSearchWithMatches extends SavedSearch {
  matchCount: number;
  newSlugs: string[];
}

/**
 * Current matches per subscription, split into "already seen" and "new".
 * This is what makes the feature useful before email exists: the team can see
 * that four people are waiting on 2-bed Dubai Marina under 3M and that two
 * listings now qualify.
 */
export async function savedSearchesWithMatches(): Promise<SavedSearchWithMatches[]> {
  const rows = await listSavedSearches();
  const byMarket = new Map<Market, Awaited<ReturnType<typeof getListings>>>();

  const out: SavedSearchWithMatches[] = [];
  for (const r of rows) {
    if (!byMarket.has(r.market)) byMarket.set(r.market, await getListings(r.market));
    const listings = byMarket.get(r.market)!;
    const hits = listings.filter((l) => matches(l, r.query));
    out.push({
      ...r,
      matchCount: hits.length,
      newSlugs: hits.filter((l) => !r.seenSlugs.includes(l.slug)).map((l) => l.slug),
    });
  }
  return out;
}

/** Marks the current matches as seen — call after a batch has been actioned. */
export async function acknowledgeMatches(id: string): Promise<SavedSearch | null> {
  const rows = await store.all();
  const row = rows.find((r) => r.id === id);
  if (!row) return null;

  const listings = await getListings(row.market);
  const seenSlugs = listings.filter((l) => matches(l, row.query)).map((l) => l.slug);

  return store.update(
    (r) => r.id === id,
    (r) => ({ ...r, seenSlugs, lastCheckedAt: new Date().toISOString() }),
  );
}

/** Demand signal: which areas people are asking for, ranked. */
export async function demandByArea(): Promise<
  { market: Market; area: string; subscribers: number; matches: number }[]
> {
  const rows = await savedSearchesWithMatches();
  const map = new Map<string, { market: Market; area: string; subscribers: number; matches: number }>();

  for (const r of rows) {
    if (!r.active) continue;
    const area = r.query.locality ?? r.query.city ?? "Anywhere";
    const key = `${r.market}:${area}`;
    const prev = map.get(key);
    map.set(key, {
      market: r.market,
      area,
      subscribers: (prev?.subscribers ?? 0) + 1,
      matches: (prev?.matches ?? 0) + r.matchCount,
    });
  }
  return [...map.values()].sort((a, b) => b.subscribers - a.subscribers);
}
