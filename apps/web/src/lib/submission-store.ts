import "server-only";
import { head, put } from "@vercel/blob";
import type { Submission } from "./submissions-types";

/**
 * Durable backing for the submission queue.
 *
 * A module-level Map does not work on serverless. Instances are created and
 * destroyed per traffic, so a write lands on one instance and the next read
 * lands on another — a newly created listing simply vanishes. That is not a
 * "resets on cold start" caveat, it is a correctness failure on every request.
 *
 * Until Atlas arrives this persists the queue as a single JSON blob in the
 * Blob store that already backs photo upload. Shared across instances, free
 * tier, no extra account.
 *
 * KNOWN LIMIT — read-modify-write. Two admins acting in the same instant can
 * clobber one another. That is acceptable for a small internal queue and
 * disappears when this moves to Atlas, where each mutation becomes a single
 * document update.
 */

const KEY = "queue/submissions.json";

/** In-instance memo, so one request does not re-fetch the blob repeatedly. */
let memo: { at: number; data: Submission[] } | null = null;
const MEMO_MS = 1000;

/** Dates survive JSON as strings; the publish gates compare them, so revive. */
function reviveDates(subs: Submission[]): Submission[] {
  return subs.map((s) => {
    const ae = s.listing.compliance?.ae;
    return {
      ...s,
      listing: {
        ...s.listing,
        publishedAt: s.listing.publishedAt ? new Date(s.listing.publishedAt) : undefined,
        expiresAt: s.listing.expiresAt ? new Date(s.listing.expiresAt) : undefined,
        priceHistory: (s.listing.priceHistory ?? []).map((p) => ({
          ...p,
          at: new Date(p.at),
        })),
        ...(s.listing.complianceOverride
          ? {
              complianceOverride: {
                ...s.listing.complianceOverride,
                at: new Date(s.listing.complianceOverride.at),
              },
            }
          : {}),
        ...(ae
          ? {
              compliance: {
                ...s.listing.compliance,
                ae: {
                  ...ae,
                  permitExpiry: ae.permitExpiry ? new Date(ae.permitExpiry) : undefined,
                  completionDate: ae.completionDate ? new Date(ae.completionDate) : undefined,
                },
              },
            }
          : {}),
      },
    } as Submission;
  });
}

function configured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function loadAll(seed: Submission[]): Promise<Submission[]> {
  if (!configured()) return seed;

  if (memo && Date.now() - memo.at < MEMO_MS) return memo.data;

  try {
    const meta = await head(KEY).catch(() => null);
    if (!meta) {
      // First run — lay down the seed so the queue is never empty.
      await saveAll(seed);
      memo = { at: Date.now(), data: seed };
      return seed;
    }

    // cache: "no-store" matters: the blob URL is CDN-backed and a stale read
    // here would resurrect deleted rows or hide a just-created listing.
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) throw new Error(`blob read ${res.status}`);

    const data = reviveDates((await res.json()) as Submission[]);
    memo = { at: Date.now(), data };
    return data;
  } catch {
    return seed;
  }
}

export async function saveAll(subs: Submission[]): Promise<void> {
  if (!configured()) return;
  try {
    await put(KEY, JSON.stringify(subs), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      // Never let the CDN serve a stale queue back to us.
      cacheControlMaxAge: 0,
    });
    memo = { at: Date.now(), data: subs };
  } catch {
    // Keep the in-instance copy so the current request still behaves.
    memo = { at: Date.now(), data: subs };
  }
}

export function invalidateMemo(): void {
  memo = null;
}

export function isDurable(): boolean {
  return configured();
}
