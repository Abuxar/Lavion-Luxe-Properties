import "server-only";
import { canPublishMore, TIERS } from "@lavion/schema";
import { getAgency } from "./accounts";
import { listLeads, type Lead } from "./leads";
import { listSubmissions, type SubmissionWithGates } from "./submissions";

/**
 * Agency-scoped reads.
 *
 * Scoping lives here, in one place, rather than being re-derived in each page.
 * A dashboard that filters in the component is one forgotten `.filter()` away
 * from showing an agency a competitor's pipeline, and that is the kind of
 * mistake nobody notices until it is embarrassing.
 *
 * Every function takes the agencyId explicitly and returns nothing when it is
 * missing — failing closed rather than falling back to "everything".
 */

export async function agencyListings(agencyId: string | undefined): Promise<SubmissionWithGates[]> {
  if (!agencyId) return [];
  const all = await listSubmissions();
  return all
    .filter((s) => s.listing.ownerAgencyId === agencyId)
    // Seller documents are staff-only. Stripped here rather than merely left
    // unrendered: this is the one function agency pages read through, and a
    // component that later passes a submission to the client would otherwise
    // ship the paperwork with it.
    .map(({ documents: _documents, ...rest }) => rest);
}

export async function agencyLeads(agencyId: string | undefined): Promise<Lead[]> {
  if (!agencyId) return [];

  // Leads are matched through the listing they came from, so an agency sees
  // enquiries about its own stock and nothing else. A lead with no listing
  // (a valuation request, say) is not attributable to an agency and stays with
  // staff rather than being handed to whoever happens to be nearby.
  const mine = await agencyListings(agencyId);
  const slugs = new Set(mine.map((s) => s.listing.slug));

  const leads = await listLeads();
  return leads.filter((l) => l.listingSlug && slugs.has(l.listingSlug));
}

export interface AgencyOverview {
  agencyName: string;
  tier: string;
  tierLabel: string;
  live: number;
  pending: number;
  allowance: number | null;
  canPublishMore: boolean;
  promotionsIncluded: number;
  commissionRate: number;
  leadsNew: number;
  leadsTotal: number;
}

export async function agencyOverview(
  agencyId: string | undefined,
): Promise<AgencyOverview | null> {
  if (!agencyId) return null;
  const agency = await getAgency(agencyId);
  if (!agency) return null;

  const listings = await agencyListings(agencyId);
  const leads = await agencyLeads(agencyId);
  const live = listings.filter((s) => s.listing.status === "published").length;
  const def = TIERS[agency.tier];

  return {
    agencyName: agency.name,
    tier: agency.tier,
    tierLabel: def.label,
    live,
    pending: listings.filter((s) => s.listing.status === "pending_review").length,
    allowance: def.listingAllowance,
    canPublishMore: canPublishMore(agency.tier, live),
    promotionsIncluded: def.includedPromotions,
    commissionRate: def.commissionRate,
    leadsNew: leads.filter((l) => l.status === "new").length,
    leadsTotal: leads.length,
  };
}
