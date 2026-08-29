"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";

/**
 * Shortlist — save properties to come back to and compare.
 *
 * Kept in localStorage rather than behind an account, because asking someone to
 * register before they can save a second property is how you lose them. It is
 * per-browser and per-device by design; when accounts exist this becomes the
 * anonymous half that merges on sign-in.
 *
 * Reads are wrapped in try/catch: private windows and blocked site data throw
 * on access rather than returning empty, and a shortlist must never take the
 * page down with it.
 */

const KEY = "lavion.shortlist.v1";
const EVENT = "lavion:shortlist";

export interface ShortlistItem {
  slug: string;
  market: string;
  title: string;
  price: number;
  currency: string;
  locality: string;
  city: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft: number;
  image?: string;
  addedAt: number;
}

function read(): ShortlistItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ShortlistItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: ShortlistItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Storage unavailable — the in-memory state still drives this session.
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

interface Ctx {
  items: ShortlistItem[];
  has: (slug: string) => boolean;
  toggle: (item: Omit<ShortlistItem, "addedAt">) => void;
  remove: (slug: string) => void;
  clear: () => void;
  ready: boolean;
}

const ShortlistContext = createContext<Ctx | null>(null);

export function ShortlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ShortlistItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(read());
    setReady(true);

    // Keep every mounted consumer — and other tabs — in step.
    const sync = () => setItems(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((item: Omit<ShortlistItem, "addedAt">) => {
    const cur = read();
    const next = cur.some((i) => i.slug === item.slug)
      ? cur.filter((i) => i.slug !== item.slug)
      : [...cur, { ...item, addedAt: Date.now() }];
    setItems(next);
    write(next);
  }, []);

  const remove = useCallback((slug: string) => {
    const next = read().filter((i) => i.slug !== slug);
    setItems(next);
    write(next);
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    write([]);
  }, []);

  const has = useCallback((slug: string) => items.some((i) => i.slug === slug), [items]);

  return (
    <ShortlistContext.Provider value={{ items, has, toggle, remove, clear, ready }}>
      {children}
    </ShortlistContext.Provider>
  );
}

export function useShortlist(): Ctx {
  const ctx = useContext(ShortlistContext);
  if (!ctx) throw new Error("useShortlist must be used inside ShortlistProvider");
  return ctx;
}

/* ---------- save button ---------- */

export function SaveButton({
  item,
  variant = "icon",
}: {
  item: Omit<ShortlistItem, "addedAt">;
  variant?: "icon" | "full";
}) {
  const { has, toggle, ready } = useShortlist();
  const saved = ready && has(item.slug);

  // Rendered but inert until hydrated, so the layout never shifts.
  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={() => toggle(item)}
        aria-pressed={saved}
        className={`inline-flex items-center justify-center gap-2 border px-6 py-4 text-sm font-medium transition-colors ${
          saved ? "border-brass bg-brass-wash text-brass" : "border-line hover:border-brass"
        }`}
      >
        <Heart filled={saved} />
        {saved ? "Saved" : "Save property"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        // The card is wrapped in a link — do not follow it when saving.
        e.preventDefault();
        e.stopPropagation();
        toggle(item);
      }}
      aria-label={saved ? `Remove ${item.title} from shortlist` : `Save ${item.title}`}
      aria-pressed={saved}
      className={`absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center border backdrop-blur-sm transition-colors ${
        saved
          ? "border-brass bg-brass-wash text-brass"
          : "border-paper/40 bg-ink/50 text-paper hover:border-brass"
      }`}
    >
      <Heart filled={saved} />
    </button>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.7-7.7 1.1-1.1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

/* ---------- header count ---------- */

export function ShortlistLink({ market }: { market?: string }) {
  const { items, ready } = useShortlist();
  const n = ready ? items.length : 0;

  return (
    <Link
      href={`/${market ?? "uk"}/shortlist`}
      className={`label inline-flex items-center gap-2 border px-4 py-2 transition-colors ${
        n > 0 ? "border-brass/50 bg-brass-wash !text-brass" : "border-line hover:border-brass"
      }`}
    >
      <Heart filled={n > 0} />
      <span className="tnum">{n > 0 ? n : "Saved"}</span>
    </Link>
  );
}
