"use client";

import Link from "next/link";
import { MARKETS, TRANSACTION_LABEL, type Market } from "@lavion/schema";
import { toSearchParams, type SearchQuery } from "@/lib/search";

/**
 * The filters currently applied, each removable on its own.
 *
 * Without this a visitor can see that results are narrowed but not by what,
 * and the only way out is Clear all — which throws away four deliberate
 * choices to undo one. Each chip drops exactly its own field and resets to
 * page 1, since removing a filter widens the set and the old page number may
 * no longer exist.
 */
export function ActiveFilters({
  market,
  query,
}: {
  market: Market;
  query: SearchQuery;
}) {
  const cur = MARKETS[market].currencySymbol;
  const money = (n: number) => `${cur}${n.toLocaleString()}`;

  const chips: { key: keyof SearchQuery; label: string }[] = [];

  if (query.transaction)
    chips.push({ key: "transaction", label: TRANSACTION_LABEL[query.transaction] });
  if (query.locality) chips.push({ key: "locality", label: query.locality });
  if (query.city) chips.push({ key: "city", label: query.city });
  if (query.category)
    chips.push({
      key: "category",
      label: query.category[0].toUpperCase() + query.category.slice(1),
    });
  if (query.minBeds) chips.push({ key: "minBeds", label: `${query.minBeds}+ bed` });
  if (query.maxBeds) chips.push({ key: "maxBeds", label: `up to ${query.maxBeds} bed` });
  if (query.minBaths) chips.push({ key: "minBaths", label: `${query.minBaths}+ bath` });
  if (query.minPrice) chips.push({ key: "minPrice", label: `from ${money(query.minPrice)}` });
  if (query.maxPrice) chips.push({ key: "maxPrice", label: `under ${money(query.maxPrice)}` });
  if (query.offPlan) chips.push({ key: "offPlan", label: "Off-plan" });
  if (query.goldenVisaEligible)
    chips.push({ key: "goldenVisaEligible", label: "Golden Visa eligible" });

  if (chips.length === 0) return null;

  const without = (key: keyof SearchQuery) => {
    const next = { ...query, [key]: undefined, page: 1 };
    const qs = toSearchParams(next);
    return qs ? `/${market}/search?${qs}` : `/${market}/search`;
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="label">Filtered by</span>

      {chips.map((c) => (
        <Link
          key={String(c.key)}
          href={without(c.key)}
          scroll={false}
          aria-label={`Remove filter: ${c.label}`}
          className="group inline-flex items-center gap-2 border border-brass/40 bg-brass-wash px-3 py-1.5 text-xs transition-colors hover:border-brass"
        >
          <span className="text-ink">{c.label}</span>
          <span aria-hidden className="text-brass transition-transform group-hover:scale-125">
            &times;
          </span>
        </Link>
      ))}

      {chips.length > 1 && (
        <Link
          href={`/${market}/search`}
          scroll={false}
          className="label px-2 py-1.5 hover:text-brass"
        >
          Clear all
        </Link>
      )}
    </div>
  );
}
