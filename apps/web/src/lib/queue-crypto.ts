import "server-only";
import {
  createCipheriv,
  createDecipheriv,
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
 * customer names, emails and phone numbers. That was verified against the live
 * store, not inferred — a plain GET with no credentials returned 200 and the
 * documents.
 *
 * Vercel's own fix is a private store (`access: "private"`), but that is a
 * store-level setting on the account rather than something the code can elect,
 * and property photos must stay publicly readable to render. So the documents
 * are encrypted instead: the object stays fetchable, and what an unauthorised
 * fetch gets is ciphertext.
 *
 * AES-256-GCM, from Node's built-in crypto — no dependency, nothing to pay
 * for. GCM rather than CBC because it authenticates: a tampered document fails
 * to decrypt instead of silently parsing into altered rows, which matters when
 * one of these documents decides who is an administrator.
 *
 * MIGRATION — reads accept plaintext. Documents written before this existed
 * still load, and the next write encrypts them. That means no dump-and-restore
 * step, and no window where the queue reads empty.
 */

/** Envelope prefix. Versioned so the key or cipher can change later. */
const V1 = "LLQ1";

/**
 * scrypt rather than a raw hash: the secret is a human-chosen passphrase, and
 * scrypt makes an offline guess expensive. The salt is fixed because the key
 * has to be reproducible across serverless instances that share nothing.
 */
const SALT = "lavion.queue.v1";

let cachedKey: Buffer | null = null;
let cachedFrom: string | null = null;

function secret(): string | null {
  const s = process.env.QUEUE_SECRET;
  return s && s.length >= 16 ? s : null;
}

function key(): Buffer | null {
  const s = secret();
  if (!s) return null;
  // Derived once per instance: scrypt is deliberately slow, and doing it on
  // every read would show up as latency on the admin queue.
  if (cachedKey && cachedFrom === s) return cachedKey;
  cachedKey = scryptSync(s, SALT, 32);
  cachedFrom = s;
  return cachedKey;
}

/** True when a usable key is configured, so callers can warn when it is not. */
export function isEncrypted(): boolean {
  return key() !== null;
}

/**
 * Serialise rows for storage, encrypting when a key is configured.
 *
 * With no key this returns plain JSON rather than throwing. A store that
 * refuses to write would take the whole site down the moment the env var went
 * missing; instead `isEncrypted()` is surfaced in the admin UI so the
 * unprotected state is visible rather than silent.
 */
export function seal(rows: unknown): string {
  const json = JSON.stringify(rows);
  const k = key();
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
 * Throws on an envelope that will not decrypt. That is deliberate: a wrong or
 * rotated key must not read as "empty queue", because the caller's fallback is
 * to seed a fresh document, which would overwrite real data with demo rows.
 */
export function open<T>(raw: string): T {
  const trimmed = raw.trimStart();

  // Legacy plaintext, written before encryption existed.
  if (!trimmed.startsWith(`${V1}:`)) return JSON.parse(raw) as T;

  const k = key();
  if (!k) {
    throw new Error(
      "queue document is encrypted but QUEUE_SECRET is not set — refusing to read it as empty",
    );
  }

  const [, ivB64, tagB64, bodyB64] = trimmed.split(":");
  if (!ivB64 || !tagB64 || !bodyB64) throw new Error("malformed queue envelope");

  const decipher = createDecipheriv("aes-256-gcm", k, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const json = Buffer.concat([
    decipher.update(Buffer.from(bodyB64, "base64")),
    decipher.final(),
  ]).toString("utf8");

  return JSON.parse(json) as T;
}
