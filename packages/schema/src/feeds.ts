import { z } from "zod";
import { Market } from "./market.js";

/**
 * F-aggregator — feed sources.
 *
 * The portal third of the product: inventory from agencies who do not manage a
 * dashboard, pulled in from a file they already produce. UK agencies generate
 * portal feeds for Rightmove and Zoopla today, so asking for the same export is
 * a normal commercial conversation — and it is the only lawful route. Scraping
 * a competitor is a terms-of-service and copyright problem that also breaks the
 * moment they change their markup.
 */

export const FeedFormat = z.enum(["csv", "json"]);
export type FeedFormat = z.infer<typeof FeedFormat>;

export const FeedSource = z.object({
  id: z.string(),
  agencyName: z.string().min(1),
  market: Market,
  format: FeedFormat,
  /** Remote feed URL, or absent for paste/upload-only sources. */
  url: z.string().url().optional(),
  /** Maps the agency's column names onto ours. */
  mapping: z.record(z.string(), z.string()).default({}),
  /**
   * Trusted sources may publish directly when they clear the gates. Untrusted
   * ones always land in review regardless — the default is the safe one.
   */
  autoPublish: z.boolean().default(false),
  active: z.boolean().default(true),
  createdAt: z.coerce.date(),
  lastSyncedAt: z.coerce.date().optional(),
  lastResult: z
    .object({
      created: z.number(),
      updated: z.number(),
      skipped: z.number(),
      rejected: z.number(),
      at: z.coerce.date(),
    })
    .optional(),
});
export type FeedSource = z.infer<typeof FeedSource>;

/**
 * Canonical field names a feed row may provide. Anything an agency calls
 * something else is translated by the source's `mapping`.
 */
export const FEED_FIELDS = [
  "externalRef",
  "title",
  "description",
  "transaction",
  "category",
  "price",
  "currency",
  "area",
  "areaUnit",
  "bedrooms",
  "bathrooms",
  "tenure",
  "addressLine",
  "locality",
  "city",
  "postcode",
  "latitude",
  "longitude",
  "images",
  "amenities",
  "offPlan",
  "freeholdZone",
  // market-specific compliance
  "permitNumber",
  "permitExpiry",
  "developerName",
  "escrowAccount",
  "completionDate",
  "councilTaxBand",
  "epcRating",
  "leaseholdYears",
  "serviceCharge",
  "groundRent",
  "societyName",
  "societyApprovalRef",
  "transferAuthority",
] as const;

export type FeedField = (typeof FEED_FIELDS)[number];

/** Per-row outcome, so a partial import is diagnosable rather than silent. */
export interface FeedRowResult {
  row: number;
  externalRef?: string;
  title?: string;
  outcome: "created" | "updated" | "skipped" | "rejected";
  /** Why it was rejected, or why it will stay in review. */
  reasons: string[];
  blockedByGate: boolean;
}

export interface FeedRunSummary {
  created: number;
  updated: number;
  skipped: number;
  rejected: number;
  rows: FeedRowResult[];
}
