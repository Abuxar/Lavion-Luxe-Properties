import "server-only";
import { head, put } from "@vercel/blob";

/**
 * A JSON collection persisted as a single Blob document.
 *
 * Extracted from the submission store so leads reuse it rather than repeating
 * the same load/save/revive dance. A module-level Map does not work on
 * serverless — instances come and go per request, so a write on one is
 * invisible to the next read.
 *
 * KNOWN LIMIT — read-modify-write. Concurrent writers can clobber one another.
 * Acceptable for internal queues at this volume; it disappears when these move
 * to Atlas and each mutation becomes a single document update.
 */
export interface BlobCollection<T> {
  all(): Promise<T[]>;
  replace(rows: T[]): Promise<void>;
  add(row: T): Promise<T>;
  update(match: (row: T) => boolean, next: (row: T) => T): Promise<T | null>;
}

export function createBlobCollection<T>(opts: {
  key: string;
  seed: T[];
  /** JSON hands dates back as strings; anything compared or formatted needs reviving. */
  revive?: (rows: T[]) => T[];
  /** Memo window, in ms, to avoid re-fetching within a single request. */
  memoMs?: number;
}): BlobCollection<T> {
  const { key, seed, revive = (r) => r, memoMs = 1000 } = opts;
  let memo: { at: number; data: T[] } | null = null;

  const configured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

  async function all(): Promise<T[]> {
    if (!configured()) return seed;
    if (memo && Date.now() - memo.at < memoMs) return memo.data;

    try {
      const meta = await head(key).catch(() => null);
      if (!meta) {
        await replace(seed);
        return seed;
      }
      // no-store: the blob URL is CDN-backed, and a stale read would resurrect
      // deleted rows or hide something just written.
      const res = await fetch(meta.url, { cache: "no-store" });
      if (!res.ok) throw new Error(`blob read ${res.status}`);
      const data = revive((await res.json()) as T[]);
      memo = { at: Date.now(), data };
      return data;
    } catch {
      return memo?.data ?? seed;
    }
  }

  async function replace(rows: T[]): Promise<void> {
    memo = { at: Date.now(), data: rows };
    if (!configured()) return;
    try {
      await put(key, JSON.stringify(rows), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 0,
      });
    } catch {
      // Keep the in-instance copy so the current request still behaves.
    }
  }

  async function add(row: T): Promise<T> {
    const rows = await all();
    await replace([...rows, row]);
    return row;
  }

  async function update(
    match: (row: T) => boolean,
    next: (row: T) => T,
  ): Promise<T | null> {
    const rows = await all();
    const found = rows.find(match);
    if (!found) return null;
    const updated = next(found);
    await replace(rows.map((r) => (match(r) ? updated : r)));
    return updated;
  }

  return { all, replace, add, update };
}
