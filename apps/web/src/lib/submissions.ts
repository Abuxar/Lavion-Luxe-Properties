import "server-only";
import {
  evaluatePublishGates,
  toSqft,
  type ComplianceOverride,
  type GateResult,
  type ListingInput,
  type Market,
} from "@lavion/schema";

/**
 * Submission store for F06.
 *
 * PHASE 1 — NOT DURABLE. This is a module-level Map, so it lives per serverless
 * instance and resets on cold start. It exists so the review queue is fully
 * demonstrable before a database exists; it is deliberately not presented to
 * the user as saved-forever.
 *
 * Swapping to Atlas is contained to this file: replace the four functions
 * below with Route Handler calls. The gate evaluation and the review UI do not
 * change, because they read from `evaluatePublishGates` in the shared schema.
 */

export type SubmissionStatus = "pending_review" | "approved" | "rejected";

export interface Submission {
  id: string;
  submittedAt: string;
  submitterName: string;
  submitterEmail: string;
  status: SubmissionStatus;
  /** Why an admin rejected it — shown back to the submitter. */
  reviewNote?: string;
  listing: ListingInput;
}

function draft(partial: {
  market: Market;
  title: string;
  description: string;
  category: string;
  transaction: "sale" | "rent";
  amount: number;
  currency: "GBP" | "AED" | "PKR";
  areaValue: number;
  areaUnit: "sqft" | "marla" | "kanal";
  bedrooms?: number;
  bathrooms?: number;
  tenure?: "freehold" | "leasehold" | "commonhold";
  locality: string;
  city: string;
  freeholdZone?: boolean;
  offPlan?: boolean;
  compliance?: ListingInput["compliance"];
}): ListingInput {
  return {
    slug: partial.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70),
    title: partial.title,
    description: partial.description,
    source: "self_submitted",
    status: "pending_review",
    market: partial.market,
    agents: [],
    transaction: partial.transaction,
    category: partial.category as ListingInput["category"],
    offPlan: partial.offPlan ?? false,
    price: { amount: partial.amount, currency: partial.currency, qualifier: "asking" },
    area: {
      value: partial.areaValue,
      unit: partial.areaUnit,
      canonicalSqft: toSqft(partial.areaValue, partial.areaUnit),
    },
    bedrooms: partial.bedrooms,
    bathrooms: partial.bathrooms,
    tenure: partial.tenure,
    location: {
      addressLines: [partial.locality],
      locality: partial.locality,
      city: partial.city,
      freeholdZone: partial.freeholdZone,
    },
    amenities: [],
    media: [],
    compliance: partial.compliance ?? {},
    priceHistory: [],
  };
}

/**
 * Seeded queue. Chosen so every gate outcome is visible on first load:
 * one clean approval, one missing a UAE permit, one off-plan missing escrow,
 * one UK leasehold missing lease data, one PK warning-only.
 */
const SEED: Submission[] = [
  {
    id: "sub_01",
    submittedAt: "2026-08-26T09:12:00Z",
    submitterName: "Rana Estates",
    submitterEmail: "listings@ranaestates.example",
    status: "pending_review",
    listing: draft({
      market: "ae",
      title: "Three-bedroom apartment with skyline views, Business Bay",
      description:
        "A high-floor apartment overlooking the canal and the Burj skyline, with a large balcony off the main reception and a fitted kitchen.",
      category: "apartment",
      transaction: "sale",
      amount: 3_250_000,
      currency: "AED",
      areaValue: 1780,
      areaUnit: "sqft",
      bedrooms: 3,
      bathrooms: 4,
      tenure: "freehold",
      locality: "Business Bay",
      city: "Dubai",
      freeholdZone: true,
      compliance: { ae: { permitNumber: "TRK-2026-773401", permitExpiry: new Date("2027-02-28") } },
    }),
  },
  {
    id: "sub_02",
    submittedAt: "2026-08-26T14:40:00Z",
    submitterName: "Hamdan Al Faisal",
    submitterEmail: "h.alfaisal@example.com",
    status: "pending_review",
    listing: draft({
      market: "ae",
      title: "Villa with private pool on a corner plot, Arabian Ranches",
      description:
        "A four-bedroom family villa backing onto landscaped parkland, with a private pool and a double garage.",
      category: "villa",
      transaction: "sale",
      amount: 6_900_000,
      currency: "AED",
      areaValue: 4100,
      areaUnit: "sqft",
      bedrooms: 4,
      bathrooms: 5,
      tenure: "freehold",
      locality: "Arabian Ranches",
      city: "Dubai",
      freeholdZone: true,
      // No permit — must not be publishable.
    }),
  },
  {
    id: "sub_03",
    submittedAt: "2026-08-27T07:05:00Z",
    submitterName: "Meridian Developments",
    submitterEmail: "sales@meridian.example",
    status: "pending_review",
    listing: draft({
      market: "ae",
      title: "Off-plan studios in a new waterfront release, Maritime City",
      description:
        "Studio and one-bedroom units in a new waterfront tower, with a staged payment plan through to handover.",
      category: "apartment",
      transaction: "sale",
      amount: 1_150_000,
      currency: "AED",
      areaValue: 540,
      areaUnit: "sqft",
      bedrooms: 0,
      bathrooms: 1,
      tenure: "freehold",
      locality: "Dubai Maritime City",
      city: "Dubai",
      freeholdZone: true,
      offPlan: true,
      // Permit present but off-plan disclosures missing.
      compliance: { ae: { permitNumber: "TRK-2026-990112", permitExpiry: new Date("2027-01-15") } },
    }),
  },
  {
    id: "sub_04",
    submittedAt: "2026-08-25T16:22:00Z",
    submitterName: "Northbank Residential",
    submitterEmail: "hello@northbank.example",
    status: "pending_review",
    listing: draft({
      market: "uk",
      title: "Two-bedroom riverside apartment with parking, Wapping",
      description:
        "A converted-warehouse apartment with exposed brick, river views from the reception, and a secure parking space.",
      category: "flat",
      transaction: "sale",
      amount: 875_000,
      currency: "GBP",
      areaValue: 960,
      areaUnit: "sqft",
      bedrooms: 2,
      bathrooms: 2,
      tenure: "leasehold",
      locality: "Wapping",
      city: "London",
      // Leasehold with no lease years / service charge / ground rent.
      compliance: { uk: { councilTaxBand: "E", tenureDetail: "leasehold", affectedByIssues: [] } },
    }),
  },
  {
    id: "sub_05",
    submittedAt: "2026-08-27T05:48:00Z",
    submitterName: "Bahria Property Consultants",
    submitterEmail: "info@bpc.example",
    status: "pending_review",
    listing: draft({
      market: "pk",
      title: "Ten-marla house with a lawn, Bahria Town Rawalpindi",
      description:
        "A well-kept ten-marla house on a quiet street, with a front lawn, covered parking and a servant room.",
      category: "house",
      transaction: "sale",
      amount: 34_500_000,
      currency: "PKR",
      areaValue: 10,
      areaUnit: "marla",
      bedrooms: 4,
      bathrooms: 4,
      tenure: "freehold",
      locality: "Bahria Town Phase 8",
      city: "Rawalpindi",
      // No society approval reference — warns, does not block.
    }),
  },
];

const store = new Map<string, Submission>(SEED.map((s) => [s.id, s]));
let counter = SEED.length;

export interface SubmissionWithGates extends Submission {
  gates: GateResult;
}

function withGates(s: Submission): SubmissionWithGates {
  return { ...s, gates: evaluatePublishGates(s.listing) };
}

export async function listSubmissions(
  status?: SubmissionStatus,
): Promise<SubmissionWithGates[]> {
  const all = [...store.values()]
    .filter((s) => !status || s.status === status)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return all.map(withGates);
}

export async function getSubmission(id: string): Promise<SubmissionWithGates | null> {
  const s = store.get(id);
  return s ? withGates(s) : null;
}

export async function createSubmission(input: {
  submitterName: string;
  submitterEmail: string;
  listing: ListingInput;
}): Promise<SubmissionWithGates> {
  counter += 1;
  const id = `sub_${String(counter).padStart(2, "0")}`;
  const submission: Submission = {
    id,
    submittedAt: new Date().toISOString(),
    submitterName: input.submitterName,
    submitterEmail: input.submitterEmail,
    // Nothing self-publishes. Everything lands in review.
    status: "pending_review",
    listing: { ...input.listing, source: "self_submitted", status: "pending_review" },
  };
  store.set(id, submission);
  return withGates(submission);
}

/**
 * Approval is where the gate binds. An admin cannot wave a listing through
 * that fails a blocking gate — the check runs here, not only in the UI, so a
 * crafted request cannot bypass it either.
 */
export async function approveSubmission(
  id: string,
  override?: { by: string; reason: string },
): Promise<{ ok: true; submission: SubmissionWithGates } | { ok: false; gates: GateResult }> {
  const s = store.get(id);
  if (!s) throw new Error("submission not found");

  const gates = evaluatePublishGates(s.listing);

  // Without an explicit override the gate is absolute.
  if (!gates.canPublish && !override) return { ok: false, gates };

  const bypassed = gates.failures
    .filter((f) => f.severity === "blocking")
    .map((f) => f.code);

  const record: ComplianceOverride | undefined =
    override && bypassed.length
      ? { by: override.by, reason: override.reason, at: new Date(), bypassed }
      : undefined;

  const updated: Submission = {
    ...s,
    status: "approved",
    listing: {
      ...s.listing,
      status: "published",
      publishedAt: new Date(),
      ...(record ? { complianceOverride: record } : {}),
    },
  };
  store.set(id, updated);
  return { ok: true, submission: withGates(updated) };
}

/**
 * Admin-entered listing (source: admin_entry). Skips the submitter round-trip
 * but NOT the gate — an admin entry for Dubai still needs its permit unless
 * the same override is used, and the override is recorded identically.
 */
export async function createAdminListing(input: {
  listing: ListingInput;
  by: string;
  publishNow: boolean;
  override?: { reason: string };
}): Promise<{ submission: SubmissionWithGates; published: boolean; gates: GateResult }> {
  counter += 1;
  const id = `sub_${String(counter).padStart(2, "0")}`;
  const gates = evaluatePublishGates(input.listing);

  const canPublish = input.publishNow && (gates.canPublish || !!input.override);
  const bypassed = gates.failures.filter((f) => f.severity === "blocking").map((f) => f.code);

  const record: ComplianceOverride | undefined =
    input.override && bypassed.length && canPublish
      ? { by: input.by, reason: input.override.reason, at: new Date(), bypassed }
      : undefined;

  const submission: Submission = {
    id,
    submittedAt: new Date().toISOString(),
    submitterName: input.by,
    submitterEmail: "—",
    status: canPublish ? "approved" : "pending_review",
    listing: {
      ...input.listing,
      source: "admin_entry",
      status: canPublish ? "published" : "pending_review",
      ...(canPublish ? { publishedAt: new Date() } : {}),
      ...(record ? { complianceOverride: record } : {}),
      priceHistory: [{ amount: input.listing.price.amount, at: new Date() }],
    },
  };

  store.set(id, submission);
  return { submission: withGates(submission), published: canPublish, gates };
}

/**
 * Published listings from the store, for the public site to merge with its
 * seed inventory. Replaced by an Atlas query when the database lands.
 */
export async function publishedListings(market?: Market): Promise<ListingInput[]> {
  return [...store.values()]
    .filter((s) => s.status === "approved" && s.listing.status === "published")
    .filter((s) => !market || s.listing.market === market)
    .map((s) => s.listing);
}

/** Overridden listings — the cleanup list. */
export async function overriddenListings(): Promise<Submission[]> {
  return [...store.values()].filter((s) => s.listing.complianceOverride);
}

export async function rejectSubmission(id: string, note: string): Promise<SubmissionWithGates> {
  const s = store.get(id);
  if (!s) throw new Error("submission not found");
  const updated: Submission = {
    ...s,
    status: "rejected",
    reviewNote: note,
    listing: { ...s.listing, status: "withdrawn" },
  };
  store.set(id, updated);
  return withGates(updated);
}

export async function queueCounts() {
  const all = [...store.values()];
  const overridden = all.filter((s) => s.listing.complianceOverride).length;
  const pending = all.filter((s) => s.status === "pending_review");
  const blocked = pending.filter((s) => !evaluatePublishGates(s.listing).canPublish);
  return {
    pending: pending.length,
    blocked: blocked.length,
    readyToPublish: pending.length - blocked.length,
    approved: all.filter((s) => s.status === "approved").length,
    rejected: all.filter((s) => s.status === "rejected").length,
    overridden,
  };
}
