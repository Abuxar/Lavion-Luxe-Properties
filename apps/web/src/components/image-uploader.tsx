"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";

/**
 * Image input for listings.
 *
 * `accept="image/*"` with a plain file input is what makes this work on a
 * phone: iOS and Android surface Camera / Photo Library / Files from the same
 * control, so there is no need for a separate "take a photo" path.
 *
 * Files are downscaled in the browser before upload. A modern phone photo is
 * 3-8 MB and around 4000px wide; a listing hero is never displayed above
 * ~2000px, so shipping the original wastes the seller's mobile data, our
 * storage, and the viewer's LCP. Resizing client-side fixes all three at once.
 *
 * Upload goes browser -> Vercel Blob directly via a short-lived token, so the
 * Server Action body limit never applies. If Blob is not configured the file
 * falls back to an inline data URL so the form still works.
 */

const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.82;
const MAX_FILES = 20;

export interface UploadedImage {
  url: string;
  name: string;
  pending?: boolean;
  error?: string;
}

async function downscale(file: File): Promise<Blob> {
  // HEIC from iPhones cannot always be decoded by canvas; pass it through and
  // let the server store the original rather than corrupting it.
  if (/heic|heif/i.test(file.type)) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 900_000) {
    bitmap.close();
    return file;
  }

  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/jpeg", JPEG_QUALITY),
  );
  return blob && blob.size < file.size ? blob : file;
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Could not read that file."));
    r.readAsDataURL(blob);
  });
}

export function ImageUploader({
  name = "media",
  value,
  onChange,
}: {
  name?: string;
  value: UploadedImage[];
  onChange: (next: UploadedImage[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!list.length) return;

      const room = MAX_FILES - value.length;
      if (room <= 0) {
        setNote(`Up to ${MAX_FILES} images per listing.`);
        return;
      }
      const batch = list.slice(0, room);
      if (batch.length < list.length) setNote(`Only the first ${room} were added.`);

      // Show placeholders immediately so a slow phone upload still feels alive.
      const placeholders: UploadedImage[] = batch.map((f) => ({
        url: "",
        name: f.name,
        pending: true,
      }));
      let working = [...value, ...placeholders];
      onChange(working);

      for (let i = 0; i < batch.length; i++) {
        const file = batch[i];
        const slot = value.length + i;
        try {
          const shrunk = await downscale(file);
          let url: string;

          try {
            const { upload } = await import("@vercel/blob/client");
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
            const blob = await upload(`listings/${Date.now()}-${safeName}`, shrunk, {
              access: "public",
              handleUploadUrl: "/api/upload",
              contentType: shrunk.type || file.type,
            });
            url = blob.url;
          } catch {
            // Blob unavailable (not configured, offline) — keep the form usable.
            url = await readAsDataUrl(shrunk);
          }

          working = working.map((i2, idx) =>
            idx === slot ? { url, name: file.name, pending: false } : i2,
          );
        } catch (e) {
          working = working.map((i2, idx) =>
            idx === slot
              ? {
                  url: "",
                  name: file.name,
                  pending: false,
                  error: e instanceof Error ? e.message : "Upload failed",
                }
              : i2,
          );
        }
        onChange(working);
      }
    },
    [value, onChange],
  );

  const move = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="sm:col-span-2">
      <p className="label">Photos</p>

      {/* Serialised for the form post; the visible control is the drop zone. */}
      <input type="hidden" name={name} value={value.filter((v) => v.url).map((v) => v.url).join("\n")} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={`mt-3 border border-dashed p-8 text-center transition-colors ${
          dragging ? "border-brass bg-brass-wash" : "border-line-strong bg-surface"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-brass"
        >
          Choose photos
        </button>

        <p className="mt-3 text-sm text-ink-soft">
          Drag files here, or tap to pick from your camera, photo library or files.
        </p>
        <p className="mt-1.5 text-xs text-ink-faint">
          JPEG, PNG, WebP or HEIC · up to {MAX_FILES} images · resized automatically before upload
        </p>
        {note && (
          <p className="mt-2 text-xs" style={{ color: "var(--color-ochre)" }}>
            {note}
          </p>
        )}
      </div>

      {value.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {value.map((img, i) => (
            <li key={`${img.name}-${i}`} className="border border-line bg-surface">
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                {img.pending && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="label animate-pulse">Uploading…</span>
                  </div>
                )}
                {img.error && (
                  <div className="absolute inset-0 flex items-center justify-center p-2 text-center">
                    <span className="text-xs" style={{ color: "var(--color-signal)" }}>
                      {img.error}
                    </span>
                  </div>
                )}
                {img.url && !img.pending && (
                  <Image
                    src={img.url}
                    alt={img.name}
                    fill
                    sizes="200px"
                    className="object-cover"
                    unoptimized
                  />
                )}
                {i === 0 && img.url && (
                  <span className="absolute left-1.5 top-1.5 label border border-brass/50 bg-brass-wash px-1.5 py-0.5 !text-brass">
                    Hero
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 border-t border-line p-1.5">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${img.name} earlier`}
                  className="label px-1.5 py-1 disabled:opacity-30"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === value.length - 1}
                  aria-label={`Move ${img.name} later`}
                  className="label px-1.5 py-1 disabled:opacity-30"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove ${img.name}`}
                  className="label ml-auto px-1.5 py-1 hover:!text-[var(--color-signal)]"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {value.length > 0 && (
        <p className="mt-2 text-xs text-ink-faint">
          The first image is the hero and the search-result thumbnail. Reorder with the arrows.
        </p>
      )}
    </div>
  );
}
