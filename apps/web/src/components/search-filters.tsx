"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { MARKETS, type Market } from "@lavion/schema";
import { SORTS, toSearchParams, type SearchQuery } from "@/lib/search";
import type { LocationTree, RegionNode } from "@/lib/gazetteer";

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
  locations,
  total,
}: {
  market: Market;
  query: SearchQuery;
  facets: { categories: { name: string; count: number }[] };
  /** Built on the server for this market only — see buildLocationTree. */
  locations: LocationTree;
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
    /*
      Sticky only from sm up. The location filter added two more selects to
      the top row; on a phone that row runs to several lines, and pinned under
      the header it would cover most of the screen while scrolling results.
      Below sm it scrolls away and the active-filter chips carry the state.
    */
    <div className="z-30 border border-line bg-surface/95 backdrop-blur-md sm:sticky sm:top-[var(--header-h,4.25rem)]">
      {/* Always-visible row: the filters people reach for first. Two tidy
          columns on a phone rather than a ragged wrap. */}
      <div className="grid grid-cols-2 gap-3 p-4 sm:flex sm:flex-wrap sm:items-end">
        <Select
          label="Type"
          value={query.transaction ?? ""}
          onChange={(v) => apply({ transaction: (v || undefined) as SearchQuery["transaction"] })}
          options={[
            { value: "", label: "Any" },
            { value: "sale", label: "For sale" },
            { value: "rent", label: "To rent" },
            { value: "build", label: "To build" },
          ]}
        />

        <LocationSelects locations={locations} query={query} apply={apply} />

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
          className="label col-span-2 border border-line px-4 py-2.5 transition-colors hover:border-brass sm:ml-auto"
        >
          {open ? "Fewer filters" : "More filters"}
        </button>
      </div>

      {open && (
        <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2 lg:grid-cols-4">
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

type Option = { value: string; label: string };

function Select({
  label,
  value,
  onChange,
  options,
  groups,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  /** Rendered as <optgroup>s after the flat options. Empty groups are skipped. */
  groups?: { label: string; options: Option[] }[];
  disabled?: boolean;
}) {
  return (
    /*
      min-w-0 and w-full are what keep this on the page at 360px.

      A <select> is intrinsically as wide as its widest <option>, and as a flex
      item it will not shrink below that on its own. Pakistan has area names
      like "Bahria Town Phase 8", so the control pushed the filter row 27px
      past the viewport and took the whole document with it — while the same
      row in the UAE, with shorter names, fitted and looked fine.

      truncate keeps the closed control from re-widening; the dropdown itself
      still shows each option in full.
    */
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="label">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full min-w-0 truncate border border-line bg-paper px-3 py-2 text-sm outline-none focus-visible:border-brass disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        {groups?.map((g) =>
          g.options.length ? (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ) : null,
        )}
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
    <label className="flex min-w-0 flex-col gap-1.5">
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
        className="w-full min-w-0 border border-line bg-paper px-3 py-2 text-sm tabular-nums outline-none focus-visible:border-brass"
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

/* ---------- location: region -> city -> area ---------- */

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Separates city from area in an area option's value. Area names repeat across
 * cities — "DHA Phase 6" in Lahore and Karachi, "West End" in three Scottish
 * cities — so the name alone cannot say which one was meant.
 */
const SEP = "::";

const withCount = (name: string, count: number) => (count > 0 ? `${name} (${count})` : name);

/**
 * Three cascading selects over the gazetteer.
 *
 * Nothing forces a top-down path: with no emirate chosen the city list shows
 * every city grouped by emirate, and the area list every area grouped by city,
 * so someone who knows they want Leith can pick Leith directly. Choosing a
 * child fills in its parents, and choosing a parent drops any child that no
 * longer sits inside it — the three always describe one coherent place.
 *
 * Counts are shown only where there is inventory. Places with none stay
 * selectable on purpose: a saved search there is a demand signal.
 */
function LocationSelects({
  locations,
  query,
  apply,
}: {
  locations: LocationTree;
  query: SearchQuery;
  apply: (patch: Partial<SearchQuery>) => void;
}) {
  const { regions, regionLabel, regionLabelPlural } = locations;
  const pickable = regions.filter((r) => !r.other);
  const allCities = regions.flatMap((r) => r.cities);

  const regionOf = (city: string): RegionNode | undefined =>
    regions.find((r) => r.cities.some((c) => same(c.name, city)));
  const regionName = (city: string) => {
    const r = regionOf(city);
    return r && !r.other ? r.name : undefined;
  };

  const selRegion = query.region ? pickable.find((r) => same(r.name, query.region!)) : undefined;
  const selCity = query.city ? allCities.find((c) => same(c.name, query.city!)) : undefined;

  // Which city an already-chosen area belongs to, for areas that arrived
  // without a city — older links and saved searches carried locality alone.
  const scope = selCity ? [selCity] : (selRegion?.cities ?? allCities);
  const areaCity = query.locality
    ? scope.find((c) => c.areas.some((a) => same(a.name, query.locality!)))
    : undefined;
  const areaName = areaCity?.areas.find((a) => same(a.name, query.locality!))?.name;

  const areaValue = query.locality
    ? areaCity && areaName
      ? `${areaCity.name}${SEP}${areaName}`
      : `${SEP}${query.locality}`
    : "";

  // A locality the tree does not know (a raw name from an old saved search)
  // still has to show in the control, or the select would claim "All areas"
  // while the results are filtered.
  const orphan =
    query.locality && !areaName ? [{ value: `${SEP}${query.locality}`, label: query.locality }] : [];

  const areaOptions = (c: (typeof allCities)[number]) =>
    c.areas.map((a) => ({ value: `${c.name}${SEP}${a.name}`, label: withCount(a.name, a.count) }));

  return (
    <>
      <Select
        label={regionLabel}
        value={selRegion?.name ?? ""}
        onChange={(v) => {
          if (!v) return apply({ region: undefined, city: undefined, locality: undefined });
          const r = pickable.find((x) => x.name === v);
          const keep = Boolean(selCity && r?.cities.some((c) => c.name === selCity.name));
          apply({
            region: v,
            city: keep ? selCity!.name : undefined,
            locality: keep ? query.locality : undefined,
          });
        }}
        options={[
          { value: "", label: `All ${regionLabelPlural}` },
          ...pickable.map((r) => ({ value: r.name, label: withCount(r.name, r.count) })),
        ]}
      />

      <Select
        label="City"
        value={selCity?.name ?? ""}
        onChange={(v) =>
          v
            ? apply({ region: regionName(v), city: v, locality: undefined })
            : apply({ city: undefined, locality: undefined })
        }
        options={[
          { value: "", label: "All cities" },
          ...(selRegion
            ? selRegion.cities.map((c) => ({ value: c.name, label: withCount(c.name, c.count) }))
            : []),
        ]}
        groups={
          selRegion
            ? undefined
            : regions.map((r) => ({
                label: r.name,
                options: r.cities.map((c) => ({ value: c.name, label: withCount(c.name, c.count) })),
              }))
        }
      />

      <Select
        label="Area"
        value={areaValue}
        disabled={Boolean(selCity && selCity.areas.length === 0)}
        onChange={(v) => {
          if (!v) return apply({ locality: undefined });
          const [cityName, area] = v.split(SEP);
          if (!cityName) return apply({ locality: area });
          apply({ region: regionName(cityName), city: cityName, locality: area });
        }}
        options={[
          { value: "", label: "All areas" },
          ...orphan,
          ...(selCity ? areaOptions(selCity) : []),
        ]}
        groups={
          selCity
            ? undefined
            : (selRegion?.cities ?? allCities).map((c) => ({ label: c.name, options: areaOptions(c) }))
        }
      />
    </>
  );
}
