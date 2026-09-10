import { z } from "zod";
import {
  ListingInput,
  Transaction,
  evaluatePublishGates,
  toSqft,
  type AreaUnit,
  type FeedRowResult,
  type Market,
} from "@lavion/schema";

// ListingInput is exported as both the Zod schema and its inferred type, so
// the single value import above serves for both uses in this file.
type Listing = z.infer<typeof ListingInput>;

/**
 * Feed parsing and mapping.
 *
 * Pure functions with no storage or network, so the mapping rules can be
 * tested directly — which matters, because a silent mis-map turns an agency's
 * whole catalogue into wrong data and nobody notices until a buyer calls.
 */

/**
 * Minimal RFC 4180 CSV reader.
 *
 * Hand-rolled rather than pulled in: property descriptions routinely contain
 * commas, quotes and newlines, and the naive `split(",")` that most quick
 * imports use corrupts exactly those rows.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const src = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];

    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }

    if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length < 2) return [];

  const headers = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => (o[h] = (r[i] ?? "").trim()));
    return o;
  });
}

export function parseJsonRows(text: string): Record<string, string>[] {
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : Array.isArray(data?.listings) ? data.listings : null;
  if (!arr) throw new Error("Expected a JSON array, or an object with a `listings` array.");
  return arr.map((r: Record<string, unknown>) => {
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) {
      o[k] = v === null || v === undefined ? "" : String(v);
    }
    return o;
  });
}

/** Applies a source's column mapping, falling back to our own field names. */
export function applyMapping(
  row: Record<string, string>,
  mapping: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = { ...row };
  for (const [ours, theirs] of Object.entries(mapping)) {
    if (theirs && row[theirs] !== undefined) out[ours] = row[theirs];
  }
  return out;
}

const num = (v?: string) => {
  if (!v) return undefined;
  // Agencies export "AED 2,450,000" and "1.310 sq ft" — strip to digits.
  const n = Number(v.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

const bool = (v?: string) =>
  v ? ["true", "yes", "y", "1"].includes(v.trim().toLowerCase()) : false;

const date = (v?: string) => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/** Short stable discriminator for a feed source, for slug uniqueness. */
function shortTag(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  // Take the LOW digits, not the high ones: ids like feed_001 and feed_002
  // differ only in their last characters, so a leading slice keeps the shared
  // prefix and collides — which it did.
  return h.toString(36).padStart(7, "0").slice(-4);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

const CURRENCY: Record<Market, "GBP" | "AED" | "PKR"> = {
  uk: "GBP",
  ae: "AED",
  pk: "PKR",
};

export interface MappedRow {
  listing: Listing | null;
  externalRef?: string;
  title?: string;
  errors: string[];
}

/** One feed row -> a validated ListingInput, or the reasons it could not be. */
export function mapRowToListing(
  raw: Record<string, string>,
  opts: { market: Market; feedSourceId: string; agencyName: string },
): MappedRow {
  const errors: string[] = [];
  const g = (k: string) => (raw[k] ?? "").trim() || undefined;

  const externalRef = g("externalRef");
  const title = g("title");

  if (!externalRef) errors.push("Missing externalRef — needed to match rows across syncs");
  if (!title) errors.push("Missing title");

  const price = num(g("price"));
  if (price === undefined) errors.push("Missing or unreadable price");

  const areaValue = num(g("area"));
  if (areaValue === undefined) errors.push("Missing or unreadable area");

  const locality = g("locality");
  const city = g("city");
  if (!locality) errors.push("Missing locality");
  if (!city) errors.push("Missing city");

  if (errors.length) return { listing: null, externalRef, title, errors };

  const areaUnit = ((g("areaUnit") ?? "sqft").toLowerCase() as AreaUnit) || "sqft";
  const validUnit: AreaUnit = (["sqft", "sqm", "marla", "kanal"] as const).includes(
    areaUnit as never,
  )
    ? areaUnit
    : "sqft";

  const compliance: Listing["compliance"] = {};
  if (opts.market === "ae") {
    compliance.ae = {
      permitNumber: g("permitNumber"),
      permitExpiry: date(g("permitExpiry")),
      developerName: g("developerName"),
      escrowAccount: g("escrowAccount"),
      completionDate: date(g("completionDate")),
    };
  }
  if (opts.market === "uk") {
    compliance.uk = {
      councilTaxBand: g("councilTaxBand"),
      tenureDetail: g("tenure") as "freehold" | "leasehold" | "commonhold" | undefined,
      epcRating: g("epcRating"),
      affectedByIssues: [],
      leaseholdYearsRemaining: num(g("leaseholdYears")),
      serviceChargeAnnual: num(g("serviceCharge")),
      groundRentAnnual: num(g("groundRent")),
    };
  }
  if (opts.market === "pk") {
    compliance.pk = {
      societyName: g("societyName"),
      societyApprovalRef: g("societyApprovalRef"),
      transferAuthority: g("transferAuthority"),
    };
  }

  const images = (g("images") ?? "")
    .split(/[|;,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

  const lat = num(g("latitude"));
  const lng = num(g("longitude"));

  // Slug carries BOTH the agency's ref and a discriminator for the source.
  // The ref alone is not enough: plenty of agencies number their stock from
  // "001", so two feeds would produce an identical slug for a similarly named
  // property — and slug is unique-indexed, so that is a hard failure later.
  const sourceTag = shortTag(opts.feedSourceId);
  const candidate = {
    slug: `${slugify(title!)}-${slugify(externalRef!)}-${sourceTag}`.slice(0, 84),
    title: title!,
    description: g("description") ?? `${title} in ${locality}, ${city}.`,
    source: "feed_import" as const,
    status: "pending_review" as const,
    market: opts.market,
    externalRef,
    feedSourceId: opts.feedSourceId,
    agents: [],
    // Feeds spell it however the agency does; anything unrecognised falls
    // back to sale rather than rejecting an otherwise valid row.
    transaction: (() => {
      const t = (g("transaction") ?? "sale").toLowerCase();
      return Transaction.safeParse(t).success ? (t as Transaction) : "sale";
    })(),
    category: (g("category") ?? "apartment").toLowerCase(),
    offPlan: bool(g("offPlan")),
    price: {
      amount: price!,
      currency: (g("currency") ?? CURRENCY[opts.market]) as "GBP" | "AED" | "PKR",
      qualifier: "asking" as const,
    },
    area: {
      value: areaValue!,
      unit: validUnit,
      canonicalSqft: toSqft(areaValue!, validUnit),
    },
    bedrooms: num(g("bedrooms")),
    bathrooms: num(g("bathrooms")),
    tenure: g("tenure") as "freehold" | "leasehold" | "commonhold" | undefined,
    location: {
      addressLines: [g("addressLine") ?? locality!],
      locality: locality!,
      city: city!,
      postcode: g("postcode"),
      freeholdZone: bool(g("freeholdZone")),
      ...(lat !== undefined && lng !== undefined ? { geo: { lat, lng } } : {}),
    },
    amenities: (g("amenities") ?? "")
      .split(/[|;,]/)
      .map((x) => x.trim())
      .filter(Boolean),
    media: images.map((src, i) => ({
      cloudinaryId: src,
      order: i,
      type: "image" as const,
      alt: `${title} — image ${i + 1}`,
    })),
    compliance,
    priceHistory: [],
  };

  const parsed = ListingInput.safeParse(candidate);
  if (!parsed.success) {
    return {
      listing: null,
      externalRef,
      title,
      errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }

  return { listing: parsed.data, externalRef, title, errors: [] };
}

/** Gate outcome for an imported row, reported alongside the import result. */
export function describeGate(listing: Listing): {
  blocked: boolean;
  reasons: string[];
} {
  const gates = evaluatePublishGates(listing);
  return {
    blocked: !gates.canPublish,
    reasons: gates.failures
      .filter((f) => f.severity === "blocking")
      .map((f) => f.message),
  };
}

export type { FeedRowResult };
