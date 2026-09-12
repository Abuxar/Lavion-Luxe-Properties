"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Ownership paperwork, attached by the seller.
 *
 * Unlike the photo uploader, this posts to our own route instead of straight
 * to Blob storage: the file has to reach the server to be encrypted before it
 * is written anywhere. Nothing here ever holds a URL to the stored file —
 * only an id the admin route resolves behind a staff session.
 */

const MAX_MB = 10;
const MAX_FILES = 8;
const ACCEPT = ".pdf,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif";

export interface UploadedDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  pathname: string;
  uploadedAt: string;
  pending?: boolean;
  error?: string;
}

const readable = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

export function DocumentUploader({
  name = "documents",
  value,
  onChange,
}: {
  name?: string;
  value: UploadedDocument[];
  onChange: (next: UploadedDocument[]) => void;
}) {
  const [note, setNote] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;

      const room = MAX_FILES - value.length;
      if (room <= 0) {
        setNote(`Up to ${MAX_FILES} documents.`);
        return;
      }
      const batch = list.slice(0, room);
      if (batch.length < list.length) setNote(`Only the first ${room} were added.`);

      let working: UploadedDocument[] = [
        ...value,
        ...batch.map((f) => ({
          id: `pending-${f.name}-${f.size}`,
          name: f.name,
          type: f.type,
          size: f.size,
          pathname: "",
          uploadedAt: "",
          pending: true,
        })),
      ];
      onChange(working);

      for (let i = 0; i < batch.length; i++) {
        const file = batch[i];
        const slot = value.length + i;
        let next: UploadedDocument;
        try {
          const body = new FormData();
          body.append("file", file);
          const res = await fetch("/api/documents", { method: "POST", body });
          const json = await res.json();
          next = res.ok
            ? { ...json, pending: false }
            : {
                id: `failed-${slot}`,
                name: file.name,
                type: file.type,
                size: file.size,
                pathname: "",
                uploadedAt: "",
                error: json?.error ?? "Upload failed.",
              };
        } catch {
          next = {
            id: `failed-${slot}`,
            name: file.name,
            type: file.type,
            size: file.size,
            pathname: "",
            uploadedAt: "",
            error: "Upload failed — check your connection.",
          };
        }
        working = working.map((d, idx) => (idx === slot ? next : d));
        onChange(working);
      }
    },
    [value, onChange],
  );

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const stored = value.filter((d) => d.pathname && !d.error);

  return (
    <div className="sm:col-span-2">
      <p className="label">Ownership documents</p>

      {/* Only what actually reached the store is posted with the form. */}
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(
          stored.map(({ id, name: n, type, size, pathname }) => ({ id, name: n, type, size, pathname })),
        )}
      />

      <div className="mt-3 border border-dashed border-line-strong bg-surface p-6 text-center">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
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
          className="border border-line bg-paper px-6 py-3 text-sm font-medium transition-colors hover:border-brass"
        >
          Attach documents
        </button>
        <p className="mt-3 text-sm text-ink-soft">
          Title deed, transfer letter, no-demand certificate, society or DHA file —
          whatever proves the property is yours to sell.
        </p>
        <p className="mt-1.5 text-xs text-ink-faint">
          PDF or photo · up to {MAX_FILES} files · {MAX_MB} MB each. Encrypted when
          stored, and visible only to our review team — never on the public listing.
        </p>
        {note && (
          <p className="mt-2 text-xs" style={{ color: "var(--color-ochre)" }}>
            {note}
          </p>
        )}
      </div>

      {value.length > 0 && (
        <ul className="mt-4 flex flex-col gap-px bg-line">
          {value.map((d, i) => (
            <li key={`${d.id}-${i}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-paper p-3">
              <span className="min-w-0 flex-1 truncate text-sm">{d.name}</span>
              <span className="label tnum">{readable(d.size)}</span>
              {d.pending && <span className="label animate-pulse">Uploading…</span>}
              {d.error && (
                <span className="text-xs" style={{ color: "var(--color-signal)" }}>
                  {d.error}
                </span>
              )}
              {!d.pending && !d.error && (
                <span className="label !text-brass">Attached</span>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${d.name}`}
                className="label px-1.5 py-1 hover:!text-[var(--color-signal)]"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
