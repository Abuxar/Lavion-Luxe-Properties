import "server-only";
import { createVersionedDoc, type VersionedDoc } from "./versioned-doc";
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

/** Within one instance, reuse a read this recent. */
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

/**
 * Backed by versioned-doc.ts: every save is a new immutable version, and
 * creating one that already exists fails. The single overwritten file this
 * used to be could serve a stale queue for up to a minute after a write, so a
 * save built on it could silently undo an approval made seconds earlier.
 * The old file is read once, on first use, to seed version 1.
 */
let doc: VersionedDoc<Submission> | null = null;

function queue(seed: Submission[]): VersionedDoc<Submission> {
  doc ??= createVersionedDoc<Submission>({
    name: "submissions",
    legacyKey: KEY,
    seed,
    revive: reviveDates,
    freshMs: MEMO_MS,
  });
  return doc;
}

export async function loadAll(seed: Submission[]): Promise<Submission[]> {
  return queue(seed).read();
}

/**
 * Save `subs` as the successor of `basedOn`, which must be the array
 * loadAll() returned. Throws VersionConflict if the queue changed in between
 * — it never overwrites a change it did not see.
 */
export async function saveAll(basedOn: Submission[], subs: Submission[]): Promise<void> {
  if (!doc) throw new Error("submissions: saveAll() before loadAll()");
  await doc.write(basedOn, subs);
}

/** Kept for callers; versioned-doc already re-checks the store before every write. */
export function invalidateMemo(): void {}

export function isDurable(): boolean {
  return configured();
}

export { isEncrypted } from "./queue-crypto";
export { VersionConflict } from "./versioned-doc";
