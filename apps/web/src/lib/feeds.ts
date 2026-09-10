import "server-only";
import type { FeedRowResult, FeedRunSummary, FeedSource, Market } from "@lavion/schema";
import { createBlobCollection } from "./blob-collection";
import { applyMapping, describeGate, mapRowToListing, parseCsv, parseJsonRows } from "./feed-parse";
import { importFeedListing } from "./submissions";

/**
 * Feed sources and the ingestion run.
 *
 * Two rules the whole pipeline is built around:
 *
 * 1. Imported listings go through the SAME publish gates as anything else. A
 *    feed is not a back door — a Dubai row arriving without a DLD permit is
 *    held in review exactly as a hand-typed one would be. Bulk is precisely
 *    where a compliance bypass would do the most damage.
 *
 * 2. Re-syncing updates rather than duplicates, matched on the agency's own
 *    externalRef. Feeds are re-pulled constantly; a pipeline that appends on
 *    every run buries the catalogue in copies within a week.
 */

const store = createBlobCollection<FeedSource>({
  key: "queue/feed-sources.json",
  seed: [],
  revive: (rows) =>
    rows.map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt),
      lastSyncedAt: r.lastSyncedAt ? new Date(r.lastSyncedAt) : undefined,
      lastResult: r.lastResult ? { ...r.lastResult, at: new Date(r.lastResult.at) } : undefined,
    })),
});

function nextId(rows: FeedSource[]): string {
  const max = rows.reduce((acc, r) => {
    const n = Number(r.id.replace("feed_", ""));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `feed_${String(max + 1).padStart(3, "0")}`;
}

export async function listFeedSources(): Promise<FeedSource[]> {
  const rows = await store.all();
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getFeedSource(id: string): Promise<FeedSource | undefined> {
  return (await store.all()).find((r) => r.id === id);
}

export async function createFeedSource(input: {
  agencyName: string;
  market: Market;
  format: "csv" | "json";
  url?: string;
  mapping?: Record<string, string>;
  autoPublish?: boolean;
}): Promise<FeedSource> {
  const rows = await store.all();
  const source: FeedSource = {
    id: nextId(rows),
    agencyName: input.agencyName,
    market: input.market,
    format: input.format,
    url: input.url,
    mapping: input.mapping ?? {},
    // Default false, always: a new source has not earned direct publication.
    autoPublish: input.autoPublish ?? false,
    active: true,
    createdAt: new Date(),
  };
  await store.replace([...rows, source]);
  return source;
}

export async function setFeedActive(id: string, active: boolean) {
  return store.update((r) => r.id === id, (r) => ({ ...r, active }));
}

export async function deleteFeedSource(id: string) {
  const rows = await store.all();
  await store.replace(rows.filter((r) => r.id !== id));
}

/** Fetches a remote feed. Kept separate so a run can also take pasted text. */
export async function fetchFeedText(url: string): Promise<string> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "LavionLuxe-FeedIngest/1.0" },
  });
  if (!res.ok) throw new Error(`Feed responded ${res.status}`);
  return res.text();
}

export interface RunOptions {
  /** Parse and report without writing anything. */
  dryRun?: boolean;
}

/**
 * Runs one ingestion pass over feed text.
 *
 * Reports per-row so a partial import is diagnosable. A run that says
 * "imported 40 of 60" without saying which twenty failed, or why, is not
 * actionable — and quietly losing a fifth of an agency's catalogue is how a
 * portal loses the agency.
 */
export async function runFeed(
  source: FeedSource,
  text: string,
  opts: RunOptions = {},
): Promise<FeedRunSummary> {
  let raw: Record<string, string>[];
  try {
    raw = source.format === "json" ? parseJsonRows(text) : parseCsv(text);
  } catch (e) {
    return {
      created: 0,
      updated: 0,
      skipped: 0,
      rejected: 1,
      rows: [
        {
          row: 0,
          outcome: "rejected",
          reasons: [e instanceof Error ? e.message : "Could not parse the feed"],
          blockedByGate: false,
        },
      ],
    };
  }

  const rows: FeedRowResult[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let rejected = 0;

  for (let i = 0; i < raw.length; i++) {
    const mapped = applyMapping(raw[i], source.mapping);
    const result = mapRowToListing(mapped, {
      market: source.market,
      feedSourceId: source.id,
      agencyName: source.agencyName,
    });

    if (!result.listing) {
      rejected++;
      rows.push({
        row: i + 1,
        externalRef: result.externalRef,
        title: result.title,
        outcome: "rejected",
        reasons: result.errors,
        blockedByGate: false,
      });
      continue;
    }

    const gate = describeGate(result.listing);
    const canPublish = source.autoPublish && !gate.blocked;

    if (opts.dryRun) {
      skipped++;
      rows.push({
        row: i + 1,
        externalRef: result.externalRef,
        title: result.title,
        outcome: "skipped",
        reasons: gate.blocked
          ? gate.reasons
          : [canPublish ? "Would publish" : "Would be held for review"],
        blockedByGate: gate.blocked,
      });
      continue;
    }

    const { action } = await importFeedListing({
      listing: result.listing,
      externalRef: result.externalRef!,
      feedSourceId: source.id,
      agencyName: source.agencyName,
      publish: canPublish,
    });

    if (action === "created") created++;
    else updated++;

    rows.push({
      row: i + 1,
      externalRef: result.externalRef,
      title: result.title,
      outcome: action,
      reasons: gate.blocked ? gate.reasons : [],
      blockedByGate: gate.blocked,
    });
  }

  const summary: FeedRunSummary = { created, updated, skipped, rejected, rows };

  if (!opts.dryRun) {
    await store.update(
      (r) => r.id === source.id,
      (r) => ({
        ...r,
        lastSyncedAt: new Date(),
        lastResult: { created, updated, skipped, rejected, at: new Date() },
      }),
    );
  }

  return summary;
}
