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
 * RUN THIS ONLY AFTER QUEUE_SECRET IS LIVE IN PRODUCTION. Encrypting first
 * would leave the deployed site unable to read its own queue, and it would be
 * right to refuse rather than report an empty one.
 *
 *   node --env-file=../../.env.local scripts/encrypt-queue.mjs        # dry run
 *   node --env-file=../../.env.local scripts/encrypt-queue.mjs --write
 *
 * Safe to re-run: an already-encrypted document is left alone.
 */
import { head, put } from "@vercel/blob";
import { createCipheriv, randomBytes, scryptSync } from "node:crypto";

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
const secret = process.env.QUEUE_SECRET;

if (!secret || secret.length < 16) {
  console.error("QUEUE_SECRET is missing or under 16 characters — nothing to do.");
  process.exit(1);
}

const key = scryptSync(secret, SALT, 32);

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
    console.log(`  ${k.padEnd(28)} already encrypted`);
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
