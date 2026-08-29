"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * Listing gallery with a lightbox.
 *
 * Previously only media[0] rendered, so every photo after the first — the ones
 * a seller uploaded and a buyer wants — was invisible.
 *
 * This is a money page judged on INP, so there is no animation library here:
 * CSS transitions, a handful of state, and the lightbox mounts only once
 * opened. Keyboard is a first-class path because a gallery you cannot arrow
 * through is a gallery most people give up on.
 */
export interface GalleryImage {
  src: string;
  alt: string;
}

export function PropertyGallery({
  images,
  title,
  overlay,
}: {
  images: GalleryImage[];
  title: string;
  /** Sold/let scrim, rendered above the hero image. */
  overlay?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  const count = images.length;
  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count],
  );

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);

    // Stop the page scrolling behind the lightbox.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      // Return focus where it came from, or the keyboard user is stranded.
      openerRef.current?.focus();
    };
  }, [open, go]);

  if (!count) return null;
  const current = images[index];

  return (
    <>
      <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
        <Image
          src={current.src}
          alt={current.alt}
          fill
          priority
          sizes="(max-width: 1400px) 100vw, 1400px"
          className="object-cover transition-opacity duration-300"
        />

        {overlay}

        {count > 1 && (
          <>
            <Arrow side="left" onClick={() => go(-1)} label="Previous photo" />
            <Arrow side="right" onClick={() => go(1)} label="Next photo" />
          </>
        )}

        <button
          ref={openerRef}
          type="button"
          onClick={() => setOpen(true)}
          className="label absolute bottom-3 right-3 border border-paper/40 bg-ink/70 px-3 py-2 !text-paper backdrop-blur-sm transition-colors hover:border-brass"
        >
          {count > 1 ? `${index + 1} / ${count} · View all` : "View full size"}
        </button>
      </div>

      {count > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <li key={`${img.src}-${i}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Photo ${i + 1} of ${count}`}
                aria-current={i === index ? "true" : undefined}
                className={`relative block h-16 w-24 overflow-hidden border transition-colors ${
                  i === index ? "border-brass" : "border-line hover:border-line-strong"
                }`}
              >
                <Image src={img.src} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — photo ${index + 1} of ${count}`}
          className="fixed inset-0 z-[100] flex flex-col bg-[#0b1416]/97"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="flex items-center justify-between p-4">
            <span className="label !text-[#c7cfcb] tnum">
              {index + 1} / {count}
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              className="label border border-[#f1efe9]/35 px-4 py-2 !text-[#f1efe9] transition-colors hover:border-brass"
            >
              Close (Esc)
            </button>
          </div>

          <div className="relative flex-1">
            <Image
              src={current.src}
              alt={current.alt}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {count > 1 && (
            <div className="flex items-center justify-center gap-3 p-5">
              <button
                type="button"
                onClick={() => go(-1)}
                className="label border border-[#f1efe9]/35 px-5 py-3 !text-[#f1efe9] transition-colors hover:border-brass"
              >
                &larr; Previous
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="label border border-[#f1efe9]/35 px-5 py-3 !text-[#f1efe9] transition-colors hover:border-brass"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Arrow({
  side,
  onClick,
  label,
}: {
  side: "left" | "right";
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 -translate-y-1/2 border border-paper/30 bg-ink/60 px-3 py-4 text-paper backdrop-blur-sm transition-colors hover:border-brass ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      <span aria-hidden>{side === "left" ? "←" : "→"}</span>
    </button>
  );
}
