import "server-only";
import { head, put } from "@vercel/blob";
import { isEncrypted, open, seal } from "./queue-crypto";

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
    // With no Blob token the memo is the only store — returning the seed here
    // would discard every write made this run.
    if (!configured()) return memo?.data ?? seed;
    if (memo && Date.now() - memo.at < memoMs) return memo.data;

    const meta = await head(key).catch(() => null);
    if (!meta) {
      await replace(seed);
      return seed;
    }

    // The document EXISTS from here on, so a read failure must propagate
    // rather than fall back to the seed. Handing back demo rows for a live
    // collection is not a degraded read — the next write would commit them
    // over the real ones. That matters most for users.json, where the seed
    // would silently replace the account list.
    // no-store: the blob URL is CDN-backed, and a stale read would resurrect
    // deleted rows or hide something just written.
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) throw new Error(`blob read ${res.status}`);
    const data = revive(open<T[]>(await res.text()));
    memo = { at: Date.now(), data };
    return data;
  }

  async function replace(rows: T[]): Promise<void> {
    memo = { at: Date.now(), data: rows };
    if (!configured()) return;
    try {
      await put(key, seal(rows), {
        access: "public",
        // Encrypted at rest — see queue-crypto.ts. These documents carry
        // password hashes and customer contact details, and the store itself
        // is public.
        contentType: isEncrypted() ? "application/octet-stream" : "application/json",
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
