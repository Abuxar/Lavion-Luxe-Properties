/**
 * One-off migration: encrypt the queue documents already sitting in Blob.
 *
 * The store is a PUBLIC Vercel Blob store, so every object in it is readable
 * by anyone holding the store host — and that host is published in the URL of
 * every property photo the site serves. Verified, not assumed: an anonymous
 * GET returned 200 with the admin password hash and real customer contact
 * details.
 *
 * New writes encrypt themselves once QUEUE_SECRET is set. This exists because
 * users.json and leads.json may not be written again for weeks, and until they
 * are they stay readable.
 *
 * The key is chosen exactly as queue-crypto.ts chooses it: QUEUE_SECRET if set,
 * otherwise derived from BLOB_READ_WRITE_TOKEN. RUN ONLY AFTER that code is
 * live in production, and with the same env production has — a different key
 * would leave the deployed site unable to read its own queue.
 *
 *   node --env-file=../../.env.local scripts/encrypt-queue.mjs          # dry run
 *   node --env-file=../../.env.local scripts/encrypt-queue.mjs --write
 *   node --env-file=../../.env.local scripts/encrypt-queue.mjs --check  # decrypt test
 *
 * Safe to re-run: an already-encrypted document is left alone.
 */
import { head, put } from "@vercel/blob";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, scryptSync } from "node:crypto";

const V1 = "LLQ1";
const SALT = "lavion.queue.v1"; // must match src/lib/queue-crypto.ts
const KEYS = [
  "queue/submissions.json",
  "queue/users.json",
  "queue/agencies.json",
  "queue/leads.json",
  "queue/saved-searches.json",
  "queue/feed-sources.json",
];

const write = process.argv.includes("--write");
const check = process.argv.includes("--check");
const secret = process.env.QUEUE_SECRET;
const token = process.env.BLOB_READ_WRITE_TOKEN;

// Same order as queue-crypto.ts.
const key =
  secret && secret.length >= 16
    ? scryptSync(secret, SALT, 32)
    : token
      ? Buffer.from(hkdfSync("sha256", token, SALT, "queue-encryption", 32))
      : null;
if (!key) {
  console.error("No QUEUE_SECRET and no BLOB_READ_WRITE_TOKEN — nothing to do.");
  process.exit(1);
}
console.log(`key source: ${secret && secret.length >= 16 ? "QUEUE_SECRET" : "derived from BLOB_READ_WRITE_TOKEN"}`);

function openEnvelope(raw) {
  const [, iv, tag, body] = raw.trimStart().split(":");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(body, "base64")), d.final()]).toString("utf8"));
}

function seal(json) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  return [
    V1,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    body.toString("base64"),
  ].join(":");
}

console.log(write ? "WRITING\n" : "DRY RUN — pass --write to apply\n");

for (const k of KEYS) {
  const meta = await head(k).catch(() => null);
  if (!meta) {
    console.log(`  ${k.padEnd(28)} absent, skipped`);
    continue;
  }

  const raw = await (await fetch(meta.url, { cache: "no-store" })).text();
  if (raw.trimStart().startsWith(`${V1}:`)) {
    if (check) {
      try {
        const rows = openEnvelope(raw);
        console.log(`  ${k.padEnd(28)} encrypted, opens with this key (${rows.length} rows)`);
      } catch {
        console.log(`  ${k.padEnd(28)} encrypted, DOES NOT open with this key`);
      }
    } else {
      console.log(`  ${k.padEnd(28)} already encrypted`);
    }
    continue;
  }

  // Parse before writing: a document that will not parse is one this script
  // does not understand, and overwriting it would destroy it.
  let rows;
  try {
    rows = JSON.parse(raw);
  } catch {
    console.log(`  ${k.padEnd(28)} NOT VALID JSON — left untouched`);
    continue;
  }

  const sealed = seal(JSON.stringify(rows));
  if (!write) {
    console.log(`  ${k.padEnd(28)} would encrypt (${rows.length} rows, ${raw.length}b -> ${sealed.length}b)`);
    continue;
  }

  await put(k, sealed, {
    access: "public",
    contentType: "application/octet-stream",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0,
  });
  console.log(`  ${k.padEnd(28)} encrypted (${rows.length} rows)`);
}

console.log(write ? "\nDone." : "\nNothing written.");
