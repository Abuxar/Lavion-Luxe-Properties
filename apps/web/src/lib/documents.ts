import "server-only";
import { head, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { openBytes, sealBytes } from "./queue-crypto";
import type { SubmissionDocument } from "./submissions-types";

/**
 * Seller documents: stored encrypted, served only to staff.
 *
 * Listing photos go straight from the browser to Blob storage, which is the
 * right trade for a photo — it is meant to be public. A title deed, a no-demand
 * certificate or a copy of a passport is not: the store is public, so anything
 * written there in the clear is readable by anyone who has the URL.
 *
 * So documents take a different path. The file is posted to the server, checked,
 * encrypted with the same key as the queue documents, and written under a random
 * pathname. The listing never carries it, and the only way to read one back is
 * the staff-gated admin route, which decrypts in the function and streams the
 * bytes with no-store.
 */

/** PDFs and photographs of paperwork — what sellers actually have to hand. */
export const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "image/heic": "HEIC",
  "image/heif": "HEIF",
};

export const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Production keeps its documents separate from local and preview runs, the
 * same way the queue does — a local test must not leave files in the folder
 * the live site's submissions point at.
 */
function prefix(): string {
  const env = process.env.VERCEL_ENV;
  return env === "production" ? "documents" : `documents-${env ?? "local"}`;
}

/** Any environment's document folder, for validating a posted pathname. */
const DOCUMENT_PATH = /^documents(-[a-z]+)?\/[^/]+$/;
export const MAX_DOCUMENTS = 8;

/**
 * Best-effort upload limit, per IP per window.
 *
 * In-memory, so on serverless it is per instance: it raises the cost of using
 * a public upload endpoint as free storage rather than making it impossible.
 * Shared state arrives with Atlas — said plainly rather than implied.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 30;
const seen = new Map<string, { count: number; first: number }>();

export function uploadAllowed(ip: string): boolean {
  const now = Date.now();
  for (const [k, v] of seen) if (now - v.first > WINDOW_MS) seen.delete(k);

  const rec = seen.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) {
    seen.set(ip, { count: 1, first: now });
    return true;
  }
  rec.count += 1;
  return rec.count <= MAX_PER_WINDOW;
}

export interface StoredDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  pathname: string;
  uploadedAt: string;
}

/** Trim a filename to something safe to show and to put in a pathname. */
function safeName(name: string): string {
  return (name.split(/[\\/]/).pop() ?? "document")
    .replace(/[^a-zA-Z0-9._ -]/g, "-")
    .slice(0, 80);
}

export async function storeDocument(file: File): Promise<
  { ok: true; document: StoredDocument } | { ok: false; error: string }
> {
  if (!ALLOWED_TYPES[file.type]) {
    return { ok: false, error: `That file type is not accepted. Use ${Object.values(ALLOWED_TYPES).join(", ")}.` };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: `That file is over ${Math.round(MAX_BYTES / 1024 / 1024)} MB.` };
  }
  if (file.size === 0) return { ok: false, error: "That file is empty." };

  const name = safeName(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());

  // Throws when no key is configured, rather than writing a readable document
  // into a public store.
  const sealed = sealBytes(bytes);

  const blob = await put(`${prefix()}/${name}`, sealed, {
    access: "public",
    // Encrypted, so what the store serves is unreadable; the random suffix
    // means the pathname cannot be guessed either.
    addRandomSuffix: true,
    contentType: "application/octet-stream",
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });

  return {
    ok: true,
    document: {
      id: randomUUID(),
      name,
      type: file.type,
      size: file.size,
      pathname: blob.pathname,
      uploadedAt: new Date().toISOString(),
    },
  };
}

/** Decrypt a stored document. Callers must have checked the session first. */
export async function readDocument(pathname: string): Promise<Buffer> {
  const meta = await head(pathname);
  const res = await fetch(meta.url, { cache: "no-store" });
  if (!res.ok) throw new Error(`document read failed (${res.status})`);
  return openBytes(new Uint8Array(await res.arrayBuffer()));
}

/** What the submit form posts back, before it becomes a SubmissionDocument. */
export function parseDocumentField(raw: string | null): SubmissionDocument[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  // Rebuilt field by field: whatever the browser posted is untrusted, and
  // status must never arrive already "verified".
  return parsed.slice(0, MAX_DOCUMENTS).flatMap((d): SubmissionDocument[] => {
    if (typeof d !== "object" || d === null) return [];
    const o = d as Record<string, unknown>;
    const name = typeof o.name === "string" ? safeName(o.name) : "";
    const pathname = typeof o.pathname === "string" ? o.pathname : "";
    const type = typeof o.type === "string" ? o.type : "";
    if (!name || !DOCUMENT_PATH.test(pathname) || !ALLOWED_TYPES[type]) return [];
    return [
      {
        id: typeof o.id === "string" && o.id.length <= 64 ? o.id : randomUUID(),
        name,
        type,
        size: typeof o.size === "number" && o.size > 0 ? Math.min(o.size, MAX_BYTES) : 0,
        pathname,
        uploadedAt: new Date().toISOString(),
        status: "pending",
      },
    ];
  });
}
