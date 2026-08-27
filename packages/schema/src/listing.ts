import { z } from "zod";
import { AreaUnit, Currency, Market } from "./market.js";

/** Origin is a field, not a schema. One collection serves all three products. */
export const ListingSource = z.enum([
  "self_submitted",
  "feed_import",
  "admin_entry",
]);
export type ListingSource = z.infer<typeof ListingSource>;

export const ListingStatus = z.enum([
  "draft",
  "pending_review",
  "published",
  "sold",
  "let",
  "withdrawn",
  "expired",
]);
export type ListingStatus = z.infer<typeof ListingStatus>;

/** Sold and let pages keep their URL and their accumulated authority. */
export const TERMINAL_BUT_INDEXABLE: ListingStatus[] = ["sold", "let"];

export const Transaction = z.enum(["sale", "rent"]);
export const Tenure = z.enum(["freehold", "leasehold", "commonhold"]);
export const PropertyCategory = z.enum([
  "apartment",
  "villa",
  "townhouse",
  "penthouse",
  "house",
  "flat",
  "plot",
  "office",
  "retail",
  "warehouse",
]);
export type PropertyCategory = z.infer<typeof PropertyCategory>;

export const Money = z.object({
  amount: z.number().nonnegative(),
  currency: Currency,
  /** For cross-market sort only. Never rendered as the asking price. */
  canonicalUsd: z.number().nonnegative().optional(),
  qualifier: z
    .enum(["asking", "offers_over", "offers_in_region", "poa", "from"])
    .default("asking"),
});

export const Area = z.object({
  value: z.number().positive(),
  unit: AreaUnit,
  /** Computed on write. Never converted at read time. */
  canonicalSqft: z.number().positive(),
});

/**
 * Deliberately loose. UK has postcodes; most emirates address by area+building
 * with no postal code; Pakistan addresses by society/phase/block. A required
 * postcode field makes UAE data unenterable.
 */
export const Location = z.object({
  addressLines: z.array(z.string()).min(1),
  locality: z.string().min(1),
  city: z.string().min(1),
  region: z.string().optional(),
  postcode: z.string().optional(),
  /** Drives the UAE freehold-zone flag and therefore Golden Visa eligibility. */
  freeholdZone: z.boolean().optional(),
  geo: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .optional(),
});

export const MediaItem = z.object({
  cloudinaryId: z.string().min(1),
  order: z.number().int().nonnegative(),
  type: z.enum(["image", "video", "floorplan", "tour"]).default("image"),
  alt: z.string().optional(),
});

/* ---------- per-market compliance blocks ---------- */

export const AeCompliance = z.object({
  /** DLD Trakheesi permit. Publishing without a live one is a RERA violation. */
  permitNumber: z.string().min(1).optional(),
  permitExpiry: z.coerce.date().optional(),
  /** Off-plan adverts additionally require these three. */
  developerName: z.string().optional(),
  escrowAccount: z.string().optional(),
  completionDate: z.coerce.date().optional(),
});

export const UkCompliance = z.object({
  // NTSELAT Part A
  councilTaxBand: z.string().optional(),
  tenureDetail: Tenure.optional(),
  // Part B / C
  epcRating: z.string().optional(),
  constructionMaterials: z.string().optional(),
  parking: z.string().optional(),
  /** Part C is issue-specific: only required when the property is affected. */
  affectedByIssues: z.array(z.string()).default([]),
  leaseholdYearsRemaining: z.number().int().optional(),
  serviceChargeAnnual: z.number().optional(),
  groundRentAnnual: z.number().optional(),
});

export const PkCompliance = z.object({
  societyName: z.string().optional(),
  societyApprovalRef: z.string().optional(),
  transferAuthority: z.string().optional(),
});

export const Compliance = z.object({
  ae: AeCompliance.optional(),
  uk: UkCompliance.optional(),
  pk: PkCompliance.optional(),
});

/** Computed from ComplianceRule data — never authored per listing. */
export const ForeignOwnership = z.object({
  eligible: z.boolean(),
  basis: z.string(),
  visaThresholdMet: z.boolean().default(false),
});

export const PricePoint = z.object({
  amount: z.number().nonnegative(),
  at: z.coerce.date(),
});

/* ---------- the listing ---------- */

export const ListingInput = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(8).max(160),
  description: z.string().min(20),

  source: ListingSource,
  status: ListingStatus.default("draft"),
  market: Market,

  ownerAgencyId: z.string().optional(),
  agents: z
    .array(z.object({ agentId: z.string(), territory: z.string() }))
    .default([]),

  transaction: Transaction,
  category: PropertyCategory,
  offPlan: z.boolean().default(false),

  price: Money,
  area: Area,
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(50).optional(),
  tenure: Tenure.optional(),

  location: Location,
  amenities: z.array(z.string()).default([]),
  media: z.array(MediaItem).default([]),

  compliance: Compliance.default({}),
  foreignOwnership: ForeignOwnership.optional(),

  priceHistory: z.array(PricePoint).default([]),
  publishedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
});

export type ListingInput = z.infer<typeof ListingInput>;
export type Listing = ListingInput & { _id: string; createdAt: Date; updatedAt: Date };

/* ---------- search ---------- */

export const ListingQuery = z.object({
  market: Market,
  transaction: Transaction.optional(),
  category: z.array(PropertyCategory).optional(),
  city: z.string().optional(),
  locality: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  minBeds: z.coerce.number().int().optional(),
  maxBeds: z.coerce.number().int().optional(),
  offPlan: z.coerce.boolean().optional(),
  /** UAE only: filter to listings that clear the Golden Visa threshold. */
  goldenVisaEligible: z.coerce.boolean().optional(),
  sort: z
    .enum(["newest", "price_asc", "price_desc", "beds_desc"])
    .default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(60).default(24),
});
export type ListingQuery = z.infer<typeof ListingQuery>;
