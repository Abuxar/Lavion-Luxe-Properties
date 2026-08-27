import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * One collection for all three products. `source` and `market` are fields, so
 * search, alerts, area guides and sitemaps never fork.
 */
const MoneySchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, enum: ["GBP", "AED", "PKR"] },
    canonicalUsd: { type: Number, min: 0 },
    qualifier: {
      type: String,
      enum: ["asking", "offers_over", "offers_in_region", "poa", "from"],
      default: "asking",
    },
  },
  { _id: false },
);

const AreaSchema = new Schema(
  {
    value: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, enum: ["sqft", "sqm", "marla", "kanal"] },
    canonicalSqft: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const LocationSchema = new Schema(
  {
    addressLines: { type: [String], default: [] },
    locality: { type: String, required: true },
    city: { type: String, required: true },
    region: String,
    postcode: String,
    freeholdZone: Boolean,
    geo: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: undefined }, // [lng, lat]
    },
  },
  { _id: false },
);

const ListingSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },

    source: {
      type: String,
      required: true,
      enum: ["self_submitted", "feed_import", "admin_entry"],
    },
    status: {
      type: String,
      required: true,
      enum: ["draft", "pending_review", "published", "sold", "let", "withdrawn", "expired"],
      default: "draft",
    },
    market: { type: String, required: true, enum: ["uk", "ae", "pk"] },

    ownerAgencyId: { type: Schema.Types.ObjectId, ref: "Agency" },
    agents: [{ _id: false, agentId: Schema.Types.ObjectId, territory: String }],

    transaction: { type: String, required: true, enum: ["sale", "rent"] },
    category: { type: String, required: true },
    offPlan: { type: Boolean, default: false },

    price: { type: MoneySchema, required: true },
    area: { type: AreaSchema, required: true },
    bedrooms: Number,
    bathrooms: Number,
    tenure: { type: String, enum: ["freehold", "leasehold", "commonhold"] },

    location: { type: LocationSchema, required: true },
    amenities: { type: [String], default: [] },
    media: [
      {
        _id: false,
        cloudinaryId: String,
        order: Number,
        type: { type: String, default: "image" },
        alt: String,
      },
    ],

    compliance: { type: Schema.Types.Mixed, default: {} },
    foreignOwnership: { type: Schema.Types.Mixed },

    // First-class, because F03 price trends and F01 "reduced" alerts both read
    // it and backfilling it later is impossible.
    priceHistory: [{ _id: false, amount: Number, at: Date }],

    publishedAt: Date,
    expiresAt: Date,
  },
  { timestamps: true },
);

/**
 * Indexes are the difference between staying under the Flex throughput ceiling
 * and hitting it. Each one maps to a query the product actually issues.
 */

// The main search: always scoped by market + status, then filtered.
ListingSchema.index({
  market: 1,
  status: 1,
  transaction: 1,
  category: 1,
  "price.amount": 1,
});

// Area-guide pages (F03) and the location taxonomy.
ListingSchema.index({ market: 1, status: 1, city: 1, locality: 1 });
ListingSchema.index({ market: 1, status: 1, "location.city": 1, "location.locality": 1 });

// Default sort.
ListingSchema.index({ market: 1, status: 1, publishedAt: -1 });

// The permit-revalidation worker: find AE listings whose permit lapses soon.
// Partial index keeps it tiny — it only covers rows the worker can act on.
ListingSchema.index(
  { "compliance.ae.permitExpiry": 1 },
  {
    partialFilterExpression: { market: "ae", status: "published" },
    name: "ae_permit_expiry_watch",
  },
);

// Geospatial search for map-based discovery.
ListingSchema.index({ "location.geo": "2dsphere" });

// Feed dedup: one listing per agency reference.
ListingSchema.index(
  { ownerAgencyId: 1, slug: 1 },
  { name: "agency_slug", sparse: true },
);

export type ListingDoc = InferSchemaType<typeof ListingSchema>;
export const ListingModel = model("Listing", ListingSchema);
