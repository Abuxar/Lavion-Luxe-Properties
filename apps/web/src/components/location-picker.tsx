"use client";

import { useMemo } from "react";
import type { Market } from "@lavion/schema";
import type { SubmitMarket } from "@/lib/gazetteer";

/**
 * Where the property is, chosen rather than typed.
 *
 * Free-text city and area fields were filing properties under the wrong
 * market and spelling the same place three ways — "Londan", "London, UK",
 * "london" — which then fails to match the search filter, so the listing
 * publishes and is never found. Country, region, city and area now come from
 * the gazetteer the filter itself reads, so a submitted place and a
 * searchable place are the same string by construction.
 *
 * The exact address stays a free text box: no list can hold house numbers,
 * and it is the one part of the address we never publish.
 */

export const MARKET_LABEL: Record<Market, string> = {
  uk: "United Kingdom",
  ae: "United Arab Emirates",
  pk: "Pakistan",
};

export interface LocationValue {
  region: string;
  city: string;
  /** A gazetteer area, or "" when the seller is entering their own. */
  area: string;
  /** Used when the area is not on the list. */
  areaOther: string;
  address: string;
}

export const EMPTY_LOCATION: LocationValue = {
  region: "",
  city: "",
  area: "",
  areaOther: "",
  address: "",
};

/** What the form posts as the locality: the chosen area, or the typed one. */
export function localityOf(v: LocationValue): string {
  return (v.area === OTHER ? v.areaOther : v.area).trim();
}

const OTHER = "__other__";

export function LocationPicker({
  market,
  onMarketChange,
  places,
  value,
  onChange,
  issues = {},
}: {
  market: Market;
  onMarketChange: (m: Market) => void;
  places: Record<Market, SubmitMarket>;
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  issues?: Record<string, string>;
}) {
  const here = places[market];

  const region = useMemo(
    () => here.regions.find((r) => r.name === value.region),
    [here, value.region],
  );
  const city = useMemo(
    () => region?.cities.find((c) => c.name === value.city),
    [region, value.city],
  );

  // Each level clears the ones below it, so a half-changed address can never
  // be submitted — picking Dubai after Lahore must not keep "DHA Phase 6".
  const setMarket = (m: Market) => {
    onMarketChange(m);
    onChange({ ...EMPTY_LOCATION, address: value.address });
  };
  const setRegion = (name: string) =>
    onChange({ ...value, region: name, city: "", area: "", areaOther: "" });
  const setCity = (name: string) =>
    onChange({ ...value, city: name, area: "", areaOther: "" });

  const locality = localityOf(value);

  return (
    <>
      {/* What the server actually reads. The selects above are the interface;
          these are the values, so nothing is posted half-resolved. */}
      <input type="hidden" name="market" value={market} />
      <input type="hidden" name="region" value={value.region} />
      <input type="hidden" name="city" value={value.city} />
      <input type="hidden" name="locality" value={locality} />
      <input type="hidden" name="addressLine" value={value.address.trim()} />

      <Picker
        label="Country"
        value={market}
        onChange={(v) => setMarket(v as Market)}
        placeholder="Select a country"
        options={(Object.keys(places) as Market[]).map((m) => ({
          value: m,
          label: MARKET_LABEL[m],
        }))}
        hint="This decides the currency and the rules your listing is checked against."
      />

      <Picker
        label={here.regionLabel}
        value={value.region}
        onChange={setRegion}
        placeholder={`Select a ${here.regionLabel.toLowerCase()}`}
        options={here.regions.map((r) => ({ value: r.name, label: r.name }))}
        error={issues.region}
      />

      <Picker
        label="City"
        value={value.city}
        onChange={setCity}
        placeholder={region ? "Select a city" : `Choose a ${here.regionLabel.toLowerCase()} first`}
        disabled={!region}
        options={(region?.cities ?? []).map((c) => ({ value: c.name, label: c.name }))}
        error={issues.city}
      />

      <Picker
        label="Area / locality"
        value={value.area}
        onChange={(v) => onChange({ ...value, area: v, areaOther: "" })}
        placeholder={city ? "Select an area" : "Choose a city first"}
        disabled={!city}
        options={[
          ...(city?.areas ?? []).map((a) => ({ value: a, label: a })),
          ...(city ? [{ value: OTHER, label: "Somewhere else — I'll type it" }] : []),
        ]}
        error={issues.locality}
      />

      {value.area === OTHER && (
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="label">Area name</span>
          <input
            value={value.areaOther}
            onChange={(e) => onChange({ ...value, areaOther: e.target.value })}
            required
            className="border border-line bg-paper px-4 py-3 text-sm outline-none transition-colors focus:border-brass"
            placeholder="The neighbourhood or scheme this property is in"
          />
        </label>
      )}

      <label className="flex flex-col gap-2 sm:col-span-2">
        <span className="label">Exact address</span>
        <input
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          required
          className="border border-line bg-paper px-4 py-3 text-sm outline-none transition-colors focus:border-brass"
          placeholder="House or unit number, street, building"
        />
        <span className="text-xs text-ink-faint">
          For our team only — the public listing shows the area and city, never
          this. It is how we tell two properties on the same street apart.
        </span>
      </label>

      {locality && value.city && (
        <p className="label sm:col-span-2 !normal-case !tracking-normal">
          Filing under{" "}
          <span className="!text-brass">
            {locality}, {value.city}, {MARKET_LABEL[market]}
          </span>
        </p>
      )}
    </>
  );
}

function Picker({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="label">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required
        // A select sizes to its widest option and will not shrink as a grid
        // item without this, which is what pushed the search filters wide.
        className="w-full min-w-0 border border-line bg-paper px-4 py-3 text-sm outline-none transition-colors focus:border-brass disabled:opacity-50"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && !error && <span className="text-xs text-ink-faint">{hint}</span>}
      {error && (
        <span className="text-xs" style={{ color: "var(--color-signal)" }}>
          {error}
        </span>
      )}
    </label>
  );
}
