import { cacheLife } from "next/cache";
import { toSqft, type Market } from "@lavion/schema";

/**
 * Data access for the web app.
 *
 * All reads go through the Express API on the KVM4 box — Vercel never holds
 * Atlas credentials and never opens its own pool. When the API is unreachable
 * (local dev before the backend is up) we fall back to the sample set so the
 * UI is always workable.
 */

const API = process.env.API_BASE_URL ?? "http://localhost:4000";

export interface ListingSummary {
  slug: string;
  title: string;
  market: Market;
  status: string;
  transaction: "sale" | "rent";
  category: string;
  offPlan: boolean;
  price: { amount: number; currency: string; qualifier?: string };
  area: { canonicalSqft: number };
  bedrooms?: number;
  bathrooms?: number;
  tenure?: string;
  location: { locality: string; city: string; freeholdZone?: boolean };
  media: { cloudinaryId: string; alt?: string }[];
  publishedAt?: string;
}

export interface ListingDetail extends ListingSummary {
  description: string;
  amenities: string[];
  compliance?: Record<string, Record<string, unknown>>;
}

/* ---------- sample inventory ---------- */

function area(value: number, unit: "sqft" | "marla" | "kanal") {
  return { canonicalSqft: toSqft(value, unit) };
}

const SAMPLE: ListingDetail[] = [
  {
    slug: "marina-gate-penthouse-dubai",
    title: "Penthouse with full marina frontage, Marina Gate",
    market: "ae",
    status: "published",
    transaction: "sale",
    category: "penthouse",
    offPlan: false,
    price: { amount: 12_500_000, currency: "AED" },
    ...{ area: area(4820, "sqft") },
    bedrooms: 4,
    bathrooms: 5,
    tenure: "freehold",
    location: { locality: "Dubai Marina", city: "Dubai", freeholdZone: true },
    media: [{ cloudinaryId: "/samples/marina-penthouse.svg", alt: "Marina frontage" }],
    description:
      "A full-floor penthouse on the water's edge, with uninterrupted frontage across the marina and a wraparound terrace that follows the sun from morning to dusk. Interiors are finished in travertine and smoked oak, with a private lift lobby and staff quarters.",
    amenities: ["Private lift", "Wraparound terrace", "Concierge", "Pool", "Covered parking"],
    publishedAt: "2026-08-02",
    compliance: { ae: { permitNumber: "TRK-2026-884210", permitExpiry: "2026-12-31" } },
  },
  {
    slug: "creek-horizon-two-bed-offplan",
    title: "Two-bedroom residence with creek views, Dubai Creek Harbour",
    market: "ae",
    status: "published",
    transaction: "sale",
    category: "apartment",
    offPlan: true,
    price: { amount: 2_450_000, currency: "AED", qualifier: "from" },
    ...{ area: area(1310, "sqft") },
    bedrooms: 2,
    bathrooms: 3,
    tenure: "freehold",
    location: { locality: "Dubai Creek Harbour", city: "Dubai", freeholdZone: true },
    media: [{ cloudinaryId: "/samples/creek-horizon.svg", alt: "Creek Harbour tower" }],
    description:
      "An off-plan residence in the next Creek Harbour release, oriented toward the water and the Ras Al Khor sanctuary beyond. Handover scheduled for Q4 2028 with a staged payment plan.",
    amenities: ["Infinity pool", "Gym", "Podium gardens", "Retail promenade"],
    publishedAt: "2026-08-14",
    compliance: {
      ae: {
        permitNumber: "TRK-2026-901774",
        permitExpiry: "2026-11-30",
        developerName: "Emaar Properties",
        escrowAccount: "ESC-4471-DCH",
        completionDate: "2028-12-01",
      },
    },
  },
  {
    slug: "chelsea-garden-square-townhouse",
    title: "Stucco-fronted townhouse on a garden square, Chelsea",
    market: "uk",
    status: "published",
    transaction: "sale",
    category: "townhouse",
    offPlan: false,
    price: { amount: 4_950_000, currency: "GBP" },
    ...{ area: area(3240, "sqft") },
    bedrooms: 5,
    bathrooms: 3,
    tenure: "freehold",
    location: { locality: "Chelsea", city: "London" },
    media: [{ cloudinaryId: "/samples/chelsea-townhouse.svg", alt: "Chelsea townhouse" }],
    description:
      "A white stucco townhouse arranged over five floors, with direct key access to the private garden square. Retains its original cornicing and shutters, with a rebuilt kitchen opening onto a walled south-facing garden.",
    amenities: ["Garden square access", "South-facing garden", "Original features", "Cellar"],
    publishedAt: "2026-07-28",
    compliance: {
      uk: { councilTaxBand: "H", tenureDetail: "freehold", epcRating: "C" },
    },
  },
  {
    slug: "marylebone-lateral-apartment",
    title: "Lateral apartment with a portered entrance, Marylebone",
    market: "uk",
    status: "published",
    transaction: "sale",
    category: "flat",
    offPlan: false,
    price: { amount: 1_875_000, currency: "GBP" },
    ...{ area: area(1420, "sqft") },
    bedrooms: 2,
    bathrooms: 2,
    tenure: "leasehold",
    location: { locality: "Marylebone", city: "London" },
    media: [{ cloudinaryId: "/samples/marylebone-flat.svg", alt: "Marylebone apartment" }],
    description:
      "A quiet lateral apartment on the third floor of a portered mansion block, moments from Marylebone High Street. Dual aspect, with generous ceiling heights and a wide reception running the width of the building.",
    amenities: ["Porter", "Lift", "Dual aspect", "Residents' store"],
    publishedAt: "2026-08-09",
    compliance: {
      uk: {
        councilTaxBand: "G",
        tenureDetail: "leasehold",
        epcRating: "D",
        leaseholdYearsRemaining: 112,
        serviceChargeAnnual: 6400,
        groundRentAnnual: 350,
      },
    },
  },
  {
    slug: "dha-phase-6-kanal-villa-lahore",
    title: "One-kanal villa on a corner plot, DHA Phase 6",
    market: "pk",
    status: "published",
    transaction: "sale",
    category: "villa",
    offPlan: false,
    price: { amount: 82_500_000, currency: "PKR" },
    ...{ area: area(1, "kanal") },
    bedrooms: 5,
    bathrooms: 6,
    tenure: "freehold",
    location: { locality: "DHA Phase 6", city: "Lahore" },
    media: [{ cloudinaryId: "/samples/dha-villa.svg", alt: "DHA Phase 6 villa" }],
    description:
      "A newly completed one-kanal villa on a corner plot, with a double-height entrance hall, basement home cinema and a lawn on two sides. Finished to order with imported fittings throughout.",
    amenities: ["Basement cinema", "Corner plot", "Servant quarters", "Standby generator"],
    publishedAt: "2026-08-18",
    compliance: {
      pk: { societyName: "DHA Lahore", societyApprovalRef: "DHA-L-6-22841", transferAuthority: "DHA Lahore" },
    },
  },
  {
    slug: "clifton-block-2-sea-facing-karachi",
    title: "Sea-facing apartment with a wide terrace, Clifton Block 2",
    market: "pk",
    status: "published",
    transaction: "sale",
    category: "apartment",
    offPlan: false,
    price: { amount: 46_000_000, currency: "PKR" },
    ...{ area: area(12, "marla") },
    bedrooms: 3,
    bathrooms: 4,
    tenure: "freehold",
    location: { locality: "Clifton Block 2", city: "Karachi" },
    media: [{ cloudinaryId: "/samples/clifton-apartment.svg", alt: "Clifton sea view" }],
    description:
      "An upper-floor apartment facing the sea across Clifton, with a terrace deep enough to dine on and evening light through the main reception.",
    amenities: ["Sea view", "Terrace", "Backup power", "Covered parking"],
    publishedAt: "2026-08-21",
    compliance: { pk: { societyName: "Clifton Cantonment", transferAuthority: "CBC Karachi" } },
  },
];

/* ---------- access ---------- */

export async function getListings(
  market: Market,
  opts: { limit?: number; transaction?: string } = {},
): Promise<ListingSummary[]> {
  "use cache";
  cacheLife("search");
  try {
    const url = new URL("/api/listings", API);
    url.searchParams.set("market", market);
    if (opts.transaction) url.searchParams.set("transaction", opts.transaction);
    if (opts.limit) url.searchParams.set("perPage", String(opts.limit));

    const res = await fetch(url);
    if (!res.ok) throw new Error(`api ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.items) && data.items.length) return data.items;
    throw new Error("empty");
  } catch {
    const items = SAMPLE.filter((l) => l.market === market);
    return opts.limit ? items.slice(0, opts.limit) : items;
  }
}

export async function getListing(
  market: Market,
  slug: string,
): Promise<ListingDetail | null> {
  "use cache";
  cacheLife("listing");
  try {
    const res = await fetch(`${API}/api/listings/${market}/${slug}`);
    if (!res.ok) throw new Error(`api ${res.status}`);
    const data = await res.json();
    if (data.listing) return data.listing;
    throw new Error("empty");
  } catch {
    return SAMPLE.find((l) => l.market === market && l.slug === slug) ?? null;
  }
}

export async function getAllSlugs(): Promise<{ market: Market; slug: string }[]> {
  "use cache";
  cacheLife("listing");
  return SAMPLE.map((l) => ({ market: l.market, slug: l.slug }));
}
