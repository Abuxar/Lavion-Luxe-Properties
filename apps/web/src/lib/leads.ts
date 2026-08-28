import "server-only";
import { toSqft, type AreaUnit, type Market } from "@lavion/schema";
import { createBlobCollection } from "./blob-collection";
import { routeToAgent } from "./agents";
import { getListings } from "./listings";

/**
 * Leads — enquiries, viewing requests and valuation requests (F02, F08).
 *
 * One collection with a `kind` discriminator, for the same reason listings use
 * one collection with a `source` discriminator: an inbox, a routing rule and a
 * status workflow written twice will drift.
 */

export type LeadKind = "enquiry" | "viewing" | "valuation";
export type LeadStatus = "new" | "contacted" | "closed";
export type LeadChannel = "form" | "whatsapp" | "call";

export interface Lead {
  id: string;
  kind: LeadKind;
  status: LeadStatus;
  channel: LeadChannel;
  createdAt: string;
  market: Market;

  name: string;
  email: string;
  phone?: string;
  message?: string;

  /** Present on enquiry and viewing leads. */
  listingSlug?: string;
  listingTitle?: string;
  locality?: string;
  city?: string;
  /** Viewing requests carry a preferred date. */
  preferredDate?: string;

  /** Valuation requests describe a property we do not yet list. */
  valuation?: {
    addressLine: string;
    locality: string;
    city: string;
    category: string;
    bedrooms?: number;
    areaValue: number;
    areaUnit: AreaUnit;
    canonicalSqft: number;
    /** Snapshot of the indicative estimate shown at request time. */
    estimate?: ValuationEstimate;
  };

  /** F08 — resolved at capture time, so the inbox is already routed. */
  assignedAgentId: string;
  assignedAgentName: string;
  note?: string;
}

const store = createBlobCollection<Lead>({
  key: "queue/leads.json",
  seed: [],
});

function nextId(rows: Lead[]): string {
  const max = rows.reduce((acc, r) => {
    const n = Number(r.id.replace("lead_", ""));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `lead_${String(max + 1).padStart(3, "0")}`;
}

export async function listLeads(status?: LeadStatus): Promise<Lead[]> {
  const rows = await store.all();
  return rows
    .filter((r) => !status || r.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createLead(
  input: Omit<Lead, "id" | "createdAt" | "status" | "assignedAgentId" | "assignedAgentName">,
): Promise<Lead> {
  const rows = await store.all();
  const agent = routeToAgent(input.market, {
    locality: input.locality ?? input.valuation?.locality,
    city: input.city ?? input.valuation?.city,
  });

  const lead: Lead = {
    ...input,
    id: nextId(rows),
    createdAt: new Date().toISOString(),
    status: "new",
    assignedAgentId: agent.id,
    assignedAgentName: agent.name,
  };

  await store.replace([...rows, lead]);
  return lead;
}

export async function setLeadStatus(
  id: string,
  status: LeadStatus,
  note?: string,
): Promise<Lead | null> {
  return store.update(
    (r) => r.id === id,
    (r) => ({ ...r, status, ...(note ? { note } : {}) }),
  );
}

export async function leadCounts() {
  const rows = await store.all();
  return {
    total: rows.length,
    new: rows.filter((r) => r.status === "new").length,
    contacted: rows.filter((r) => r.status === "contacted").length,
    valuations: rows.filter((r) => r.kind === "valuation").length,
    viewings: rows.filter((r) => r.kind === "viewing").length,
  };
}

/* ---------- F02: indicative valuation from comparables ---------- */

export interface ValuationEstimate {
  low: number;
  mid: number;
  high: number;
  currency: string;
  perSqft: number;
  comparableCount: number;
  /** Which pool the comparables came from — honesty about the sample. */
  basis: "locality" | "city" | "market";
}

/**
 * An indicative range from comparable asking prices per sq ft.
 *
 * Deliberately NOT presented as a valuation. It is derived from asking prices
 * on this site, not from achieved sale prices, and a handful of comparables is
 * a thin sample — so the UI states the basis and the comparable count, and the
 * whole flow exists to book a real appraisal rather than to replace one.
 *
 * Returns null rather than inventing a number when there is nothing to compare.
 */
export async function estimateValue(input: {
  market: Market;
  locality: string;
  city: string;
  areaValue: number;
  areaUnit: AreaUnit;
}): Promise<ValuationEstimate | null> {
  const sqft = toSqft(input.areaValue, input.areaUnit);
  if (!sqft || sqft <= 0) return null;

  const all = await getListings(input.market);
  const usable = all.filter((l) => l.area.canonicalSqft > 0 && l.price.amount > 0);
  if (!usable.length) return null;

  const norm = (s: string) => s.trim().toLowerCase();

  let pool = usable.filter((l) => norm(l.location.locality) === norm(input.locality));
  let basis: ValuationEstimate["basis"] = "locality";

  if (pool.length < 2) {
    pool = usable.filter((l) => norm(l.location.city) === norm(input.city));
    basis = "city";
  }
  if (pool.length < 2) {
    pool = usable;
    basis = "market";
  }
  if (!pool.length) return null;

  const rates = pool.map((l) => l.price.amount / l.area.canonicalSqft).sort((a, b) => a - b);
  const mid = rates[Math.floor(rates.length / 2)];

  // Spread widens as the comparable sample thins — a single comparable should
  // not imply a tight range.
  const spread = pool.length >= 5 ? 0.12 : pool.length >= 3 ? 0.18 : 0.25;

  return {
    low: Math.round((mid * sqft * (1 - spread)) / 1000) * 1000,
    mid: Math.round((mid * sqft) / 1000) * 1000,
    high: Math.round((mid * sqft * (1 + spread)) / 1000) * 1000,
    currency: pool[0].price.currency,
    perSqft: Math.round(mid),
    comparableCount: pool.length,
    basis,
  };
}
