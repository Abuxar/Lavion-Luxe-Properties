import "server-only";
import { BlobError, BlobNotFoundError, del, head, list, put } from "@vercel/blob";
import { createHash } from "node:crypto";
import { isEncrypted, open, seal } from "./queue-crypto";

/**
 * A JSON document in Blob storage that is never overwritten.
 *
 * WHY — measured on this store, September 2026:
 *   - After an overwrite, every read path served the previous content for 6 to
 *     33 seconds: the plain URL, a URL with a fresh query string, and even
 *     get({ useCache: false }). Vercel documents "up to 60 seconds".
 *   - head() and list() metadata were current immediately.
 *   - So a read-modify-write took the new ETag with the old content, and even
 *     an ifMatch-guarded write then erased the newer change. Blind overwrites
 *     lost 6 of 8 concurrent updates; an admin password change was undone by
 *     the very next sign-in writing its timestamp over a stale copy.
 *
 * HOW — Vercel's own guidance, "treat blobs as immutable":
 *   - Every write creates a new object, <namespace>/<name>/<seq>.json, with
 *     overwriting disallowed. A name that has never existed has no stale copy
 *     anywhere, so reading it is current on the first fetch (6/6 measured).
 *   - Creating a name that already exists fails, atomically (three races of
 *     eight writers: one winner each). That is the concurrency control: two
 *     writers who read version N both try to create N+1, one wins, and the
 *     other is told to re-read and re-apply its change.
 *   - The latest version is found by walking head() forward from the last one
 *     this instance saw — a Simple Operation, cheap on the Hobby quota. list()
 *     runs once per cold instance.
 *
 * A mirror of this algorithm was run against the store: eight instances
 * migrating at once created exactly one version, and 8 and then 3 x 6
 * concurrent appends lost nothing, read back immediately.
 */

const WIDTH = 10;
/** Versions kept behind the latest. Older ones are deleted; del() is free. */
const KEEP = 20;

export class VersionConflict extends Error {
  constructor(name: string, seq: number) {
    super(`${name}: version ${seq} was written first by someone else`);
    this.name = "VersionConflict";
  }
}

/**
 * Production writes production data; everything else writes its own copy. A
 * local run or a preview reads the live document once, to start from real
 * data, and never writes it.
 */
function namespace(): string {
  const env = process.env.VERCEL_ENV;
  return env === "production" ? "queue/v2" : `queue/v2-${env ?? "local"}`;
}

const configured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const md5 = (s: string) => createHash("md5").update(s, "utf8").digest("hex");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface VersionedDoc<T> {
  /** The latest rows. The array returned remembers which version it came from. */
  read(): Promise<T[]>;
  /**
   * Write `next` as the version after the one `basedOn` was read from.
   * Throws VersionConflict if another writer got there first.
   */
  write(basedOn: T[], next: T[]): Promise<void>;
  /** Read, change, write — re-applied on conflict. `change` returns null for a no-op. */
  mutate(change: (rows: T[]) => T[] | null): Promise<void>;
}

export function createVersionedDoc<T>(opts: {
  /** e.g. "users" — stored as <namespace>/users/<seq>.json */
  name: string;
  /** The single overwritten file this document used to be; migrated on first read. */
  legacyKey: string;
  seed: T[];
  revive?: (rows: T[]) => T[];
  /** Within one instance, skip the head() walk if it ran this recently. */
  freshMs?: number;
}): VersionedDoc<T> {
  const { name, legacyKey, seed, revive = (r) => r, freshMs = 1000 } = opts;
  const prefix = () => `${namespace()}/${name}/`;
  const path = (seq: number) => `${prefix()}${String(seq).padStart(WIDTH, "0")}.json`;

  /**
   * Which version each returned array came from. Kept per array, not per
   * instance: one instance serves several requests at once, and a shared
   * "latest" would let two of them build on the same old copy.
   */
  const seqOf = new WeakMap<T[], number>();
  /** Latest version this instance has seen. */
  let known: { seq: number; rows: T[]; at: number } | null = null;
  /** Store host, learned from any URL, so a read need not head() first. */
  let base: string | null = null;
  /** Without a token there is no store; an in-memory sequence stands in. */
  let memorySeq = 0;

  const learnBase = (url: string, pathname: string) => {
    if (!base && url.endsWith(pathname)) base = url.slice(0, url.length - pathname.length);
  };

  const remember = (rows: T[], seq: number): T[] => {
    seqOf.set(rows, seq);
    return rows;
  };

  async function exists(seq: number): Promise<boolean> {
    try {
      const m = await head(path(seq));
      learnBase(m.url, m.pathname);
      return true;
    } catch (err) {
      if (err instanceof BlobNotFoundError) return false;
      throw err;
    }
  }

  async function discover(): Promise<number> {
    let max = 0;
    let cursor: string | undefined;
    do {
      const r = await list({ prefix: prefix(), cursor, limit: 1000 });
      for (const b of r.blobs) {
        learnBase(b.url, b.pathname);
        const n = Number(b.pathname.slice(prefix().length, prefix().length + WIDTH));
        if (Number.isFinite(n) && n > max) max = n;
      }
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor);
    return max;
  }

  async function latestSeq(): Promise<number> {
    let s = known ? known.seq : await discover();
    while (await exists(s + 1)) s++;
    return s;
  }

  async function fetchVersion(seq: number): Promise<T[]> {
    let url = base ? base + path(seq) : null;
    if (!url) {
      const m = await head(path(seq));
      learnBase(m.url, m.pathname);
      url = m.url;
    }
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${name}: version ${seq} read failed (${res.status})`);
    return revive(open<T[]>(await res.text()));
  }

  /**
   * The old single file, read once to seed version 1. It was an overwritten
   * object, so the MD5 of what comes back is checked against the ETag head()
   * reports: a stale copy is waited out, never migrated.
   */
  async function readLegacy(): Promise<T[] | null> {
    const m = await head(legacyKey).catch(() => null);
    if (!m) return null;
    const want = m.etag.replace(/"/g, "");
    for (let attempt = 0; attempt < 25; attempt++) {
      const res = await fetch(`${m.url}?v=${want}&a=${attempt}`, { cache: "no-store" });
      const text = await res.text();
      if (md5(text) === want) return revive(open<T[]>(text));
      await sleep(2500);
    }
    throw new Error(`${name}: the legacy document never read back at its current version`);
  }

  async function create(seq: number, rows: T[]): Promise<void> {
    try {
      const r = await put(path(seq), seal(rows), {
        access: "public",
        // Encrypted at rest — see queue-crypto.ts. The store itself is public.
        contentType: isEncrypted() ? "application/octet-stream" : "application/json",
        addRandomSuffix: false,
        // The concurrency control: creating an existing version fails.
        allowOverwrite: false,
        // Never overwritten, so the CDN may keep it as long as it likes.
        cacheControlMaxAge: 60 * 60 * 24 * 365,
      });
      learnBase(r.url, r.pathname);
    } catch (err) {
      if (err instanceof BlobError && /already exists/i.test(err.message)) {
        throw new VersionConflict(name, seq);
      }
      throw err;
    }
    known = { seq, rows, at: Date.now() };
    // Keep a short history. Pruning must never fail a write.
    if (seq > KEEP && base) void del(base + path(seq - KEEP)).catch(() => {});
  }

  async function read(): Promise<T[]> {
    if (!configured()) return remember(known?.rows ?? seed, memorySeq);
    if (known && Date.now() - known.at < freshMs) return remember(known.rows, known.seq);

    const s = await latestSeq();

    if (s === 0) {
      const rows = (await readLegacy()) ?? seed;
      try {
        await create(1, rows);
        return remember(rows, 1);
      } catch (err) {
        // Another instance migrated first — read what it wrote.
        if (err instanceof VersionConflict) {
          known = null;
          return read();
        }
        throw err;
      }
    }

    if (known && known.seq === s) {
      known.at = Date.now();
      return remember(known.rows, s);
    }
    const rows = await fetchVersion(s);
    known = { seq: s, rows, at: Date.now() };
    return remember(rows, s);
  }

  async function write(basedOn: T[], next: T[]): Promise<void> {
    if (!configured()) {
      memorySeq += 1;
      known = { seq: memorySeq, rows: next, at: Date.now() };
      return;
    }
    const seq = seqOf.get(basedOn);
    if (seq === undefined) throw new Error(`${name}: write() needs the rows returned by read()`);
    await create(seq + 1, next);
  }

  async function mutate(change: (rows: T[]) => T[] | null): Promise<void> {
    for (let attempt = 1; ; attempt++) {
      // A write always starts from the store's latest, never a remembered copy.
      if (known) known.at = 0;
      const rows = await read();
      const next = change(rows);
      if (next === null) return;
      try {
        await write(rows, next);
        return;
      } catch (err) {
        if (err instanceof VersionConflict && attempt < 12) {
          await sleep(Math.random() * 120 * attempt + 30);
          continue;
        }
        throw err;
      }
    }
  }

  return { read, write, mutate };
}
