import { z } from "zod";
import type { ListingInput } from "./listing.js";
import { Market } from "./market.js";

/**
 * Jurisdiction rules as versioned DATA, never as prose.
 *
 * Both the F04 eligibility filters and the F05/F10 guides render from these
 * records, so a threshold change is one edit rather than eleven articles.
 * Every rule carries its source and a review date; the UI surfaces the date
 * and an internal alert fires when a rule passes its review interval.
 *
 * NOT LEGAL ADVICE. Every rule here needs sign-off from qualified counsel in
 * the relevant jurisdiction before it is shown to a user, and thresholds move
 * with each budget cycle.
 */

export const RuleKind = z.enum([
  "foreign_ownership",
  "residency_by_investment",
  "transaction_tax",
  "repatriation",
  "registration_duty",
]);
export type RuleKind = z.infer<typeof RuleKind>;

export const ComplianceRule = z.object({
  key: z.string().min(1),
  market: Market,
  kind: RuleKind,
  title: z.string(),
  summary: z.string(),
  /** Machine-readable payload the eligibility engine reads. */
  params: z.record(z.string(), z.unknown()).default({}),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
  source: z.object({ authority: z.string(), url: z.string().url() }),
  lastReviewedAt: z.coerce.date(),
  reviewIntervalDays: z.number().int().positive().default(365),
});
export type ComplianceRule = z.infer<typeof ComplianceRule>;

export function isStale(rule: ComplianceRule, now: Date = new Date()): boolean {
  const due = new Date(rule.lastReviewedAt);
  due.setDate(due.getDate() + rule.reviewIntervalDays);
  return now > due;
}

/**
 * Seed set. These are researched starting points, each verified against the
 * cited authority — they still require counsel review before publication.
 */
export const SEED_RULES: ComplianceRule[] = [
  {
    key: "ae.golden_visa.property",
    market: "ae",
    kind: "residency_by_investment",
    title: "UAE Golden Visa via property investment",
    summary:
      "Property with a total purchase value of at least AED 2,000,000 qualifies the owner for a renewable 10-year Golden Visa. Freehold only, in a designated freehold area. Ready and off-plan both count, multiple properties may be combined to reach the threshold, and mortgaged property counts at full value rather than equity. Leasehold does not qualify.",
    params: {
      thresholdAmount: 2_000_000,
      thresholdCurrency: "AED",
      requiresFreehold: true,
      requiresDesignatedZone: true,
      combinable: true,
      offPlanEligible: true,
      countsFullValueWhenMortgaged: true,
    },
    effectiveFrom: new Date("2022-10-03"),
    source: {
      authority: "UAE Government / ICP",
      url: "https://u.ae/en/information-and-services/visa-and-emirates-id/residence-visas/golden-visa",
    },
    lastReviewedAt: new Date("2026-08-27"),
    reviewIntervalDays: 180,
  },
  {
    key: "ae.foreign_ownership.freehold_zones",
    market: "ae",
    kind: "foreign_ownership",
    title: "Foreign freehold ownership is limited to designated areas",
    summary:
      "Non-GCC foreign nationals may own freehold property only within designated freehold areas — Dubai has 60+. Outside them, foreign ownership is leasehold. Because Golden Visa eligibility also requires freehold in a designated zone, this flag drives both.",
    params: { appliesTo: "non_gcc_nationals", outsideZoneTenure: "leasehold" },
    effectiveFrom: new Date("2002-05-14"),
    source: {
      authority: "Dubai Land Department",
      url: "https://dubailand.gov.ae/en/",
    },
    lastReviewedAt: new Date("2026-08-27"),
    reviewIntervalDays: 365,
  },
  {
    key: "uk.register_of_overseas_entities",
    market: "uk",
    kind: "registration_duty",
    title: "Register of Overseas Entities",
    summary:
      "An overseas entity that owns or buys UK property must register with Companies House and identify its beneficial owners, with verification carried out by a UK AML-regulated agent. Failure to register is a criminal offence. This affects corporate buyers rather than individuals.",
    params: { appliesTo: "overseas_entities", individualsExempt: true },
    effectiveFrom: new Date("2022-08-01"),
    source: {
      authority: "Companies House / Economic Crime (Transparency and Enforcement) Act 2022",
      url: "https://www.gov.uk/guidance/register-an-overseas-entity",
    },
    lastReviewedAt: new Date("2026-08-27"),
    reviewIntervalDays: 365,
  },
  {
    key: "uk.sdlt.non_resident_surcharge",
    market: "uk",
    kind: "transaction_tax",
    title: "Non-resident SDLT surcharge",
    summary:
      "Non-UK-resident buyers of residential property in England and Northern Ireland pay a surcharge on top of standard Stamp Duty Land Tax rates. Rates change at Budgets — this record must be re-checked before each tax year and the figure is intentionally not hardcoded in page copy.",
    params: { ratesAreVolatile: true, jurisdiction: "england_ni" },
    effectiveFrom: new Date("2021-04-01"),
    source: { authority: "HMRC", url: "https://www.gov.uk/stamp-duty-land-tax" },
    lastReviewedAt: new Date("2026-08-27"),
    reviewIntervalDays: 120,
  },
  {
    key: "pk.rda.repatriation",
    market: "pk",
    kind: "repatriation",
    title: "Roshan Digital Account — guaranteed repatriation",
    summary:
      "Property funded directly through a Roshan Digital Account carries a State Bank of Pakistan guaranteed right of repatriation without prior approval. Realised capital gains are fully repatriable after a three-year holding period; if the property is sold sooner, the original principal repatriates immediately while gains are held in a local account.",
    params: {
      requiresRdaFunding: true,
      capitalGainsHoldingYears: 3,
      principalImmediatelyRepatriable: true,
    },
    effectiveFrom: new Date("2020-09-01"),
    source: {
      authority: "State Bank of Pakistan",
      url: "https://www.sbp.org.pk/RDAC/index.html",
    },
    lastReviewedAt: new Date("2026-08-27"),
    reviewIntervalDays: 180,
  },
  {
    key: "pk.advance_tax.236c_236k_filer_rate",
    market: "pk",
    kind: "transaction_tax",
    title: "Filer-rate advance tax for non-resident Pakistanis",
    summary:
      "Non-resident Pakistanis holding NICOP or POC may pay advance tax under sections 236C and 236K at Active Taxpayer List rates even when not on the ATL — but only where the purchase runs through a documented banking channel such as an RDA. Buying with cash or through an ordinary local account forfeits the benefit.",
    params: {
      requiresDocumentedBankingChannel: true,
      qualifyingIds: ["NICOP", "POC"],
      sections: ["236C", "236K"],
    },
    effectiveFrom: new Date("2022-07-01"),
    source: {
      authority: "Federal Board of Revenue",
      url: "https://fbr.gov.pk/overseas-faqs/174240/174248",
    },
    lastReviewedAt: new Date("2026-08-27"),
    reviewIntervalDays: 120,
  },
];

/* ---------- eligibility engine (F04) ---------- */

export interface EligibilityFlag {
  key: string;
  label: string;
  met: boolean;
  detail: string;
  ruleKey: string;
}

/**
 * Computes investor-facing flags from listing data plus rules. This is what
 * makes F04 a product feature rather than an article: "qualifies for the
 * Golden Visa route" is derivable from data we already hold.
 */
export function evaluateEligibility(
  listing: ListingInput,
  rules: ComplianceRule[] = SEED_RULES,
): EligibilityFlag[] {
  const flags: EligibilityFlag[] = [];
  const forMarket = rules.filter((r) => r.market === listing.market);

  if (listing.market === "ae") {
    const gv = forMarket.find((r) => r.key === "ae.golden_visa.property");
    if (gv) {
      const threshold = Number(gv.params.thresholdAmount ?? 2_000_000);
      const isFreehold = listing.tenure === "freehold";
      const inZone = listing.location.freeholdZone === true;
      const meetsValue = listing.price.currency === "AED" && listing.price.amount >= threshold;
      const met = isFreehold && inZone && meetsValue;

      flags.push({
        key: "golden_visa",
        label: "Golden Visa eligible",
        met,
        detail: met
          ? "Meets the AED 2M freehold threshold for the 10-year Golden Visa route."
          : !inZone
            ? "Outside a designated freehold area, so it does not qualify."
            : !isFreehold
              ? "Leasehold property does not qualify for the Golden Visa route."
              : `Below the AED ${threshold.toLocaleString()} threshold — can be combined with another property to qualify.`,
        ruleKey: gv.key,
      });
    }
  }

  if (listing.market === "pk") {
    const rda = forMarket.find((r) => r.key === "pk.rda.repatriation");
    if (rda)
      flags.push({
        key: "rda_repatriation",
        label: "RDA repatriation route",
        met: true,
        detail:
          "Fund this purchase through a Roshan Digital Account for SBP-guaranteed repatriation. Capital gains repatriate in full after a three-year hold.",
        ruleKey: rda.key,
      });

    const tax = forMarket.find((r) => r.key === "pk.advance_tax.236c_236k_filer_rate");
    if (tax)
      flags.push({
        key: "filer_rate_tax",
        label: "Filer-rate advance tax",
        met: true,
        detail:
          "Overseas Pakistanis with NICOP or POC can pay 236C/236K advance tax at filer rates without ATL listing, when buying through a documented banking channel.",
        ruleKey: tax.key,
      });
  }

  if (listing.market === "uk") {
    const tenure = listing.compliance?.uk?.tenureDetail ?? listing.tenure;
    if (tenure)
      flags.push({
        key: "tenure",
        label: tenure === "freehold" ? "Freehold" : "Leasehold",
        met: tenure === "freehold",
        detail:
          tenure === "leasehold"
            ? "Check years remaining, ground rent and service charge — all materially affect yield."
            : "Freehold ownership with no lease to extend.",
        ruleKey: "uk.register_of_overseas_entities",
      });
  }

  return flags;
}
