import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * Encryption at rest for the Blob-backed queues.
 *
 * The Blob store is a PUBLIC store: every object in it is readable by anyone
 * who knows the store host, and that host is published in every property photo
 * URL the site serves. Before this, `queue/users.json` handed an anonymous
 * visitor the admin password hash, and `queue/leads.json` handed them real
 * customer contact details — verified against the live store, not inferred.
 *
 * AES-256-GCM from Node's built-in crypto. GCM because it authenticates: a
 * tampered document fails to decrypt instead of silently parsing into altered
 * rows, which matters when one of these documents decides who is an admin.
 *
 * KEYS — tried in order, first one encrypts new writes:
 *   1. QUEUE_SECRET, when set (16+ chars).
 *   2. Derived from BLOB_READ_WRITE_TOKEN. Vercel already holds that token for
 *      this store, so encryption is on without anyone adding an env var. It is
 *      a real secret — the exposure being closed is anonymous reads of public
 *      blob URLs, and anyone holding the token could read the store directly
 *      anyway, so deriving from it gives nothing up.
 * Reads try every key, so moving to QUEUE_SECRET later does not strand the
 * documents written before the switch.
 *
 * CAVEAT: rotating the Blob token while relying on the derived key makes the
 * existing documents unreadable. Set QUEUE_SECRET first, let the documents be
 * rewritten under it, then rotate.
 *
 * MIGRATION — reads accept plaintext, so documents written before this existed
 * still load; scripts/encrypt-queue.mjs converts the rest.
 */

/** Envelope prefix. Versioned so the key or cipher can change later. */
const V1 = "LLQ1";

/** Fixed so the key is reproducible across instances that share nothing. */
const SALT = "lavion.queue.v1";

let cached: { from: string; keys: Buffer[] } | null = null;

function keys(): Buffer[] {
  const qs = process.env.QUEUE_SECRET;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const from = `${qs ?? ""}\u0000${token ?? ""}`;
  if (cached && cached.from === from) return cached.keys;

  const out: Buffer[] = [];
  // scrypt for a human-chosen passphrase; HKDF for a high-entropy token.
  if (qs && qs.length >= 16) out.push(scryptSync(qs, SALT, 32));
  if (token) out.push(Buffer.from(hkdfSync("sha256", token, SALT, "queue-encryption", 32)));

  cached = { from, keys: out };
  return out;
}

/** True when a usable key is configured, so callers can warn when it is not. */
export function isEncrypted(): boolean {
  return keys().length > 0;
}

/**
 * Serialise rows for storage, encrypting when a key is configured.
 *
 * With no key this returns plain JSON rather than throwing: a store that
 * refuses to write would take the site down when an env var went missing.
 * `isEncrypted()` is surfaced in the admin UI so that state is visible.
 */
export function seal(rows: unknown): string {
  const json = JSON.stringify(rows);
  const k = keys()[0];
  if (!k) return json;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [V1, iv.toString("base64"), tag.toString("base64"), body.toString("base64")].join(":");
}

/**
 * Parse a stored document, whether it is an envelope or legacy plaintext.
 *
 * Throws on an envelope no key opens. Deliberate: a wrong or rotated key must
 * not read as "empty queue", because the caller's fallback is to seed a fresh
 * document, which would overwrite real data with demo rows.
 */
export function open<T>(raw: string): T {
  const trimmed = raw.trimStart();

  // Legacy plaintext, written before encryption existed.
  if (!trimmed.startsWith(`${V1}:`)) return JSON.parse(raw) as T;

  const ks = keys();
  if (!ks.length) {
    throw new Error("queue document is encrypted but no key is configured — refusing to read it as empty");
  }

  const [, ivB64, tagB64, bodyB64] = trimmed.split(":");
  if (!ivB64 || !tagB64 || !bodyB64) throw new Error("malformed queue envelope");

  for (const k of ks) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", k, Buffer.from(ivB64, "base64"));
      decipher.setAuthTag(Buffer.from(tagB64, "base64"));
      const json = Buffer.concat([
        decipher.update(Buffer.from(bodyB64, "base64")),
        decipher.final(),
      ]).toString("utf8");
      return JSON.parse(json) as T;
    } catch {
      // Not this key — try the next.
    }
  }
  throw new Error("queue document did not decrypt with any configured key — refusing to read it as empty");
}

/* ---------- binary payloads: seller documents ---------- */

/** Envelope prefix for binary blobs. Four bytes, then iv, tag, ciphertext. */
const B1 = Buffer.from("LLB1");
const IV = 12;
const TAG = 16;

/**
 * Encrypt a file for storage.
 *
 * Seller documents — title deeds, NOCs, identity papers — go into the same
 * PUBLIC Blob store as the listing photos, where any URL is readable by
 * anyone. They are stored encrypted so that a leaked or guessed URL yields
 * bytes nobody can open, and are served only through the admin route that
 * decrypts them behind a staff session.
 *
 * Throws when no key is configured: a document written in the clear would be
 * a silent, permanent exposure, unlike a queue document that can be rewritten.
 */
export function sealBytes(data: Uint8Array): Buffer {
  const k = keys()[0];
  if (!k) throw new Error("no encryption key configured — refusing to store a document unencrypted");

  const iv = randomBytes(IV);
  const cipher = createCipheriv("aes-256-gcm", k, iv);
  const body = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([B1, iv, cipher.getAuthTag(), body]);
}

/** Decrypt a stored file, trying every configured key. */
export function openBytes(raw: Uint8Array): Buffer {
  const buf = Buffer.from(raw);
  if (!buf.subarray(0, B1.length).equals(B1)) throw new Error("not an encrypted document");

  const iv = buf.subarray(B1.length, B1.length + IV);
  const tag = buf.subarray(B1.length + IV, B1.length + IV + TAG);
  const body = buf.subarray(B1.length + IV + TAG);

  for (const k of keys()) {
    try {
      const d = createDecipheriv("aes-256-gcm", k, iv);
      d.setAuthTag(tag);
      return Buffer.concat([d.update(body), d.final()]);
    } catch {
      // Not this key — try the next.
    }
  }
  throw new Error("document did not decrypt with any configured key");
}
