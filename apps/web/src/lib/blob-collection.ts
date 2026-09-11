import "server-only";
import { createVersionedDoc } from "./versioned-doc";

/**
 * A JSON collection persisted in Blob storage.
 *
 * Shared by users, agencies, leads, saved searches and feed sources. Backed by
 * versioned-doc.ts, which never overwrites: every write is a new immutable
 * version and creating one that already exists fails. That is what makes a
 * read-modify-write safe here — see that file for what was measured and why
 * overwriting a single file could not be made to work.
 *
 * Two ways to change a collection:
 *  - add / update / mutate re-read and re-apply automatically if another
 *    writer got in first. Anything that derives something from the current
 *    rows (the next id, a duplicate check) belongs inside mutate's function,
 *    so a retry recomputes it rather than reusing a stale answer.
 *  - replace(basedOn, next) writes one whole new version and throws if the
 *    collection changed since `basedOn` was read. It never overwrites a
 *    change it did not see.
 */
export interface BlobCollection<T> {
  all(): Promise<T[]>;
  /** Write `next` as the successor of `basedOn`, which must come from all(). */
  replace(basedOn: T[], next: T[]): Promise<void>;
  add(row: T): Promise<T>;
  update(match: (row: T) => boolean, next: (row: T) => T): Promise<T | null>;
  /** Read, change, write — re-run on conflict. Return null for a no-op. */
  mutate(change: (rows: T[]) => T[] | null): Promise<void>;
}

export function createBlobCollection<T>(opts: {
  /** The collection's historical single-file key, e.g. "queue/users.json". */
  key: string;
  seed: T[];
  /** JSON hands dates back as strings; anything compared or formatted needs reviving. */
  revive?: (rows: T[]) => T[];
  /** Within one instance, reuse a read this recent. */
  memoMs?: number;
}): BlobCollection<T> {
  const doc = createVersionedDoc<T>({
    name: opts.key.replace(/^queue\//, "").replace(/\.json$/, ""),
    legacyKey: opts.key,
    seed: opts.seed,
    revive: opts.revive,
    freshMs: opts.memoMs,
  });

  async function add(row: T): Promise<T> {
    await doc.mutate((rows) => [...rows, row]);
    return row;
  }

  async function update(match: (row: T) => boolean, next: (row: T) => T): Promise<T | null> {
    let updated: T | null = null;
    await doc.mutate((rows) => {
      const found = rows.find(match);
      if (!found) {
        updated = null;
        return null;
      }
      const u = next(found);
      updated = u;
      return rows.map((r) => (match(r) ? u : r));
    });
    return updated;
  }

  return {
    all: () => doc.read(),
    replace: (basedOn, next) => doc.write(basedOn, next),
    add,
    update,
    mutate: (change) => doc.mutate(change),
  };
}
