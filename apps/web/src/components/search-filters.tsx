"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { MARKETS, type Market } from "@lavion/schema";
import { SORTS, toSearchParams, type SearchQuery } from "@/lib/search";

/**
 * Filters drive the URL, not local state.
 *
 * That keeps a result set shareable, back-button correct, and — because the
 * saved-search feature stores the same query — makes "save this search" mean
 * exactly what the user is looking at.
 */
export function SearchFilters({
  market,
  query,
  facets,
  total,
}: {
  market: Market;
  query: SearchQuery;
  facets: {
    cities: { name: string; count: number }[];
    localities: { name: string; count: number }[];
    categories: { name: string; count: number }[];
  };
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const apply = (patch: Partial<SearchQuery>) => {
    // Any filter change resets to page 1 — staying on page 4 of a narrower
    // result set is the classic way to land a user on an empty page.
    const next = { ...query, ...patch, page: 1 };
    const qs = toSearchParams(next);
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const cur = MARKETS[market].currencySymbol;

  return (
    <div className="border border-line bg-surface">
      {/* Always-visible row: the filters people reach for first. */}
      <div className="flex flex-wrap items-center gap-3 p-4">
        <Select
          label="Type"
          value={query.transaction ?? ""}
          onChange={(v) => apply({ transaction: (v || undefined) as "sale" | "rent" | undefined })}
          options={[
            { value: "", label: "Sale & rent" },
            { value: "sale", label: "For sale" },
            { value: "rent", label: "To rent" },
          ]}
        />

        <Select
          label="Area"
          value={query.locality ?? ""}
          onChange={(v) => apply({ locality: v || undefined })}
          options={[
            { value: "", label: "All areas" },
            ...facets.localities.map((l) => ({
              value: l.name,
              label: `${l.name} (${l.count})`,
            })),
          ]}
        />

        <Select
          label="Beds"
          value={query.minBeds ? String(query.minBeds) : ""}
          onChange={(v) => apply({ minBeds: v ? Number(v) : undefined })}
          options={[
            { value: "", label: "Any" },
            ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}+` })),
          ]}
        />

        <Select
          label="Sort"
          value={query.sort}
          onChange={(v) => apply({ sort: v as SearchQuery["sort"] })}
          options={SORTS.map((s) => ({ value: s.value, label: s.label }))}
        />

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="label ml-auto border border-line px-4 py-2.5 transition-colors hover:border-brass"
        >
          {open ? "Fewer filters" : "More filters"}
        </button>
      </div>

      {open && (
        <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="City"
            value={query.city ?? ""}
            onChange={(v) => apply({ city: v || undefined })}
            options={[
              { value: "", label: "All cities" },
              ...facets.cities.map((c) => ({ value: c.name, label: `${c.name} (${c.count})` })),
            ]}
          />

          <Select
            label="Property type"
            value={query.category ?? ""}
            onChange={(v) => apply({ category: v || undefined })}
            options={[
              { value: "", label: "Any type" },
              ...facets.categories.map((c) => ({
                value: c.name,
                label: `${c.name[0].toUpperCase()}${c.name.slice(1)} (${c.count})`,
              })),
            ]}
          />

          <NumberField
            label={`Min price (${cur})`}
            value={query.minPrice}
            onCommit={(n) => apply({ minPrice: n })}
          />
          <NumberField
            label={`Max price (${cur})`}
            value={query.maxPrice}
            onCommit={(n) => apply({ maxPrice: n })}
          />

          <Select
            label="Bathrooms"
            value={query.minBaths ? String(query.minBaths) : ""}
            onChange={(v) => apply({ minBaths: v ? Number(v) : undefined })}
            options={[
              { value: "", label: "Any" },
              ...[1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n}+` })),
            ]}
          />

          <Toggle
            label="Off-plan only"
            on={Boolean(query.offPlan)}
            onChange={(v) => apply({ offPlan: v || undefined })}
          />

          {market === "ae" && (
            <Toggle
              label="Golden Visa eligible"
              on={Boolean(query.goldenVisaEligible)}
              onChange={(v) => apply({ goldenVisaEligible: v || undefined })}
            />
          )}

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => router.push(pathname, { scroll: false })}
              className="label border border-line px-4 py-2.5 transition-colors hover:border-brass"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      <p className="border-t border-line px-4 py-3 label tnum">
        {total} {total === 1 ? "property" : "properties"}
      </p>
    </div>
  );
}

/* ---------- primitives ---------- */

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-line bg-paper px-3 py-2 text-sm outline-none focus-visible:border-brass"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onCommit,
}: {
  label: string;
  value?: number;
  onCommit: (n: number | undefined) => void;
}) {
  const [local, setLocal] = useState(value ? String(value) : "");
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        // Commit on blur or Enter, not per keystroke — otherwise every digit
        // pushes a history entry and refetches.
        onBlur={() => onCommit(local ? Number(local) : undefined)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit(local ? Number(local) : undefined);
          }
        }}
        className="border border-line bg-paper px-3 py-2 text-sm tabular-nums outline-none focus-visible:border-brass"
      />
    </label>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-end gap-2.5 pb-2">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--color-brass)]"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}
