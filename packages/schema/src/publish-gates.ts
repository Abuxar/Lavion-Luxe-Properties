import type { ListingInput } from "./listing.js";
import type { Market } from "./market.js";

/**
 * Per-market legal preconditions on ADVERTISING a property.
 *
 * These are not validation niceties — each one is a rule about whether the
 * advert may lawfully appear at all, so they gate the transition into
 * `published` rather than living on a form. Note this is about advertising
 * only; customer due diligence / KYC is deliberately out of scope here.
 *
 * Sources are cited per gate so a challenge is answerable in seconds.
 */

export type GateSeverity = "blocking" | "warning";

export interface GateFailure {
  code: string;
  field: string;
  message: string;
  severity: GateSeverity;
  /** Official source for the requirement. */
  authority: string;
}

export interface GateResult {
  canPublish: boolean;
  failures: GateFailure[];
}

const AE_PERMIT_GRACE_DAYS = 0;

function checkAe(listing: ListingInput, now: Date): GateFailure[] {
  const f: GateFailure[] = [];
  const ae = listing.compliance?.ae;

  if (!ae?.permitNumber) {
    f.push({
      code: "AE_PERMIT_MISSING",
      field: "compliance.ae.permitNumber",
      message:
        "A DLD advertising permit number (Trakheesi) is required before this listing can be published.",
      severity: "blocking",
      authority: "Dubai Land Department / RERA",
    });
  }

  if (!ae?.permitExpiry) {
    f.push({
      code: "AE_PERMIT_EXPIRY_MISSING",
      field: "compliance.ae.permitExpiry",
      message: "Permit expiry date is required so the listing can be revalidated automatically.",
      severity: "blocking",
      authority: "Dubai Land Department / RERA",
    });
  } else {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - AE_PERMIT_GRACE_DAYS);
    if (ae.permitExpiry < cutoff) {
      f.push({
        code: "AE_PERMIT_EXPIRED",
        field: "compliance.ae.permitExpiry",
        message: `Permit expired on ${ae.permitExpiry.toISOString().slice(0, 10)}. Renew it before republishing.`,
        severity: "blocking",
        authority: "Dubai Land Department / RERA",
      });
    }
  }

  // Off-plan adverts carry three additional mandatory disclosures.
  if (listing.offPlan) {
    if (!ae?.developerName)
      f.push({
        code: "AE_OFFPLAN_DEVELOPER_MISSING",
        field: "compliance.ae.developerName",
        message: "Off-plan adverts must name the developer.",
        severity: "blocking",
        authority: "Dubai Land Department / RERA",
      });
    if (!ae?.escrowAccount)
      f.push({
        code: "AE_OFFPLAN_ESCROW_MISSING",
        field: "compliance.ae.escrowAccount",
        message: "Off-plan adverts must state the escrow account number.",
        severity: "blocking",
        authority: "Dubai Land Department / RERA",
      });
    if (!ae?.completionDate)
      f.push({
        code: "AE_OFFPLAN_COMPLETION_MISSING",
        field: "compliance.ae.completionDate",
        message: "Off-plan adverts must state the expected completion date.",
        severity: "blocking",
        authority: "Dubai Land Department / RERA",
      });
  }

  return f;
}

function checkUk(listing: ListingInput): GateFailure[] {
  const f: GateFailure[] = [];
  const uk = listing.compliance?.uk;
  const AUTH = "National Trading Standards (NTSELAT) — Material Information";

  // Part A: price, tenure, council tax. Required on all listings.
  if (listing.price.qualifier !== "poa" && !listing.price.amount) {
    f.push({
      code: "UK_PRICE_MISSING",
      field: "price.amount",
      message: "Part A requires an asking price or an explicit POA qualifier.",
      severity: "blocking",
      authority: AUTH,
    });
  }
  if (!uk?.tenureDetail && !listing.tenure) {
    f.push({
      code: "UK_TENURE_MISSING",
      field: "compliance.uk.tenureDetail",
      message: "Part A requires tenure (freehold, leasehold or commonhold).",
      severity: "blocking",
      authority: AUTH,
    });
  }
  if (listing.transaction === "sale" && !uk?.councilTaxBand) {
    f.push({
      code: "UK_COUNCIL_TAX_MISSING",
      field: "compliance.uk.councilTaxBand",
      message: "Part A requires the council tax band for sales listings.",
      severity: "blocking",
      authority: AUTH,
    });
  }

  // Leasehold economics are Part A material information in their own right.
  const tenure = uk?.tenureDetail ?? listing.tenure;
  if (tenure === "leasehold") {
    if (uk?.leaseholdYearsRemaining === undefined)
      f.push({
        code: "UK_LEASE_YEARS_MISSING",
        field: "compliance.uk.leaseholdYearsRemaining",
        message: "Leasehold listings must state the years remaining on the lease.",
        severity: "blocking",
        authority: AUTH,
      });
    if (uk?.serviceChargeAnnual === undefined)
      f.push({
        code: "UK_SERVICE_CHARGE_MISSING",
        field: "compliance.uk.serviceChargeAnnual",
        message: "Leasehold listings must state the annual service charge.",
        severity: "blocking",
        authority: AUTH,
      });
    if (uk?.groundRentAnnual === undefined)
      f.push({
        code: "UK_GROUND_RENT_MISSING",
        field: "compliance.uk.groundRentAnnual",
        message: "Leasehold listings must state the annual ground rent.",
        severity: "blocking",
        authority: AUTH,
      });
  }

  // Part B: expected on all properties, but portals commonly publish while
  // chasing it — warn rather than block so supply is not throttled.
  if (!uk?.epcRating)
    f.push({
      code: "UK_EPC_MISSING",
      field: "compliance.uk.epcRating",
      message: "Part B expects an EPC rating. Publishing without it is a compliance gap.",
      severity: "warning",
      authority: AUTH,
    });
  if (!uk?.constructionMaterials)
    f.push({
      code: "UK_CONSTRUCTION_MISSING",
      field: "compliance.uk.constructionMaterials",
      message: "Part B expects construction materials.",
      severity: "warning",
      authority: AUTH,
    });

  return f;
}

function checkPk(listing: ListingInput): GateFailure[] {
  const f: GateFailure[] = [];
  const pk = listing.compliance?.pk;

  // Least centrally regulated of the three, and correspondingly the highest
  // fraud risk — verification is a selling point, so warn loudly.
  if (!pk?.societyApprovalRef) {
    f.push({
      code: "PK_SOCIETY_APPROVAL_MISSING",
      field: "compliance.pk.societyApprovalRef",
      message:
        "No society or development authority approval reference. Listing will be shown as unverified.",
      severity: "warning",
      authority: "Local development authority / housing society",
    });
  }
  if (!pk?.transferAuthority) {
    f.push({
      code: "PK_TRANSFER_AUTHORITY_MISSING",
      field: "compliance.pk.transferAuthority",
      message: "Transfer authority not recorded.",
      severity: "warning",
      authority: "Local development authority / housing society",
    });
  }
  return f;
}

const CHECKS: Record<Market, (l: ListingInput, now: Date) => GateFailure[]> = {
  ae: checkAe,
  uk: (l) => checkUk(l),
  pk: (l) => checkPk(l),
};

/**
 * The single source of truth for "may this listing be advertised?".
 * Called by the API before any transition into `published`, by the admin
 * review queue to explain why a listing is held, and by the scheduled
 * revalidation worker that pulls lapsed permits back out of `published`.
 */
export function evaluatePublishGates(
  listing: ListingInput,
  now: Date = new Date(),
): GateResult {
  const failures = CHECKS[listing.market](listing, now);
  return {
    canPublish: !failures.some((x) => x.severity === "blocking"),
    failures,
  };
}

/** Listings whose compliance can lapse on a clock, for the revalidation worker. */
export function hasTimeBoundCompliance(listing: ListingInput): boolean {
  return listing.market === "ae";
}
