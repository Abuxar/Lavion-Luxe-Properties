import { cacheLife, cacheTag } from "next/cache";
import {
  SEED_RULES,
  isStale,
  type ComplianceRule,
  type Market,
} from "@lavion/schema";

/**
 * F05 / F10 — investor guides, composed from ComplianceRule data.
 *
 * The instinct is to write these as CMS articles. Deliberately not: a guide is
 * editorial framing wrapped around one or more *rule records*, so when the
 * Golden Visa threshold or a UK surcharge changes you edit one record and every
 * guide that cites it updates. Each rule carries its source and the date it was
 * last reviewed, and both are rendered on the page — undated legal content is
 * worse than none.
 *
 * NOT LEGAL ADVICE. See the disclaimer rendered on every guide.
 */

export interface Guide {
  slug: string;
  market: Market;
  title: string;
  /** Sentence shown on the index card and as the meta description. */
  standfirst: string;
  /** Editorial framing. Facts live in the rules, not here. */
  intro: string;
  ruleKeys: string[];
  /** Optional listing filter, so a guide can show what qualifies. */
  qualifier?: "golden_visa";
  audience: string;
}

const GUIDES: Guide[] = [
  /* ---------- UAE ---------- */
  {
    slug: "golden-visa-through-property",
    market: "ae",
    title: "The Golden Visa through property",
    standfirst:
      "How a AED 2,000,000 freehold purchase converts into ten years of UAE residency, and which properties actually qualify.",
    intro:
      "The property route to the UAE Golden Visa is the most common reason international buyers look at Dubai rather than another market. The rules are precise and unforgiving in the details — the threshold is measured on purchase value, the property has to sit in a designated freehold area, and leasehold does not count no matter what it cost. Below is what the rule actually says, followed by the listings on this site that clear it.",
    ruleKeys: ["ae.golden_visa.property", "ae.foreign_ownership.freehold_zones"],
    qualifier: "golden_visa",
    audience: "International buyers considering UAE residency",
  },
  {
    slug: "foreign-ownership-in-dubai",
    market: "ae",
    title: "What foreigners may own in Dubai",
    standfirst:
      "Freehold, leasehold, and why the map matters more than the price.",
    intro:
      "Foreign ownership in Dubai is a question of geography before it is a question of money. Designated freehold areas — Dubai has more than sixty — allow non-GCC nationals to hold freehold title. Outside them, the same buyer gets a long lease instead. Because the Golden Visa route requires freehold in a designated zone, the two questions collapse into one.",
    ruleKeys: ["ae.foreign_ownership.freehold_zones", "ae.golden_visa.property"],
    audience: "Non-GCC buyers",
  },

  /* ---------- UK ---------- */
  {
    slug: "buying-uk-property-from-overseas",
    market: "uk",
    title: "Buying UK property from overseas",
    standfirst:
      "Registration duties, the non-resident surcharge, and what changes if you buy through a company.",
    intro:
      "There is no restriction on a foreign national owning UK property. The complications sit elsewhere: in what you owe on the way in, and in what you must disclose if you buy through a corporate structure rather than in your own name. Both have moved in recent years, and the rates in particular change at Budgets — which is why the figures below carry the date they were last checked.",
    ruleKeys: ["uk.register_of_overseas_entities", "uk.sdlt.non_resident_surcharge"],
    audience: "Overseas individuals and corporate buyers",
  },
  {
    slug: "freehold-and-leasehold-explained",
    market: "uk",
    title: "Freehold and leasehold, and why the difference is money",
    standfirst:
      "Years remaining, ground rent and service charge decide the yield — not the asking price.",
    intro:
      "Two flats on the same street at the same price can be very different investments. A short lease is a depreciating asset with an extension bill attached; a high service charge quietly removes a slice of the yield every year. Every UK listing on this site publishes those figures up front, because National Trading Standards treats them as material information a buyer needs before deciding.",
    ruleKeys: ["uk.register_of_overseas_entities"],
    audience: "Buyers comparing UK apartments",
  },

  /* ---------- Pakistan ---------- */
  {
    slug: "roshan-digital-account-property",
    market: "pk",
    title: "Buying through a Roshan Digital Account",
    standfirst:
      "The route that gives overseas Pakistanis a guaranteed right to take their money back out.",
    intro:
      "For an overseas Pakistani, the hard question is rarely how to buy — it is how to get the proceeds out afterwards. The Roshan Digital Account exists to answer exactly that, and it is the single most consequential decision in the whole transaction: the same property bought through the wrong channel loses both the repatriation guarantee and the better tax treatment.",
    ruleKeys: ["pk.rda.repatriation", "pk.advance_tax.236c_236k_filer_rate"],
    audience: "Non-resident Pakistanis with NICOP or POC",
  },
  {
    slug: "tax-for-overseas-pakistanis",
    market: "pk",
    title: "Advance tax for overseas Pakistanis",
    standfirst:
      "Filer rates without being on the Active Taxpayer List — and the one condition that decides it.",
    intro:
      "Non-resident Pakistanis can pay advance tax on a property purchase at Active Taxpayer List rates without actually being on that list. The concession is real and worth a great deal on a large purchase, but it is conditional on how the money arrives. Paying in cash, or through an ordinary local account, forfeits it entirely.",
    ruleKeys: ["pk.advance_tax.236c_236k_filer_rate", "pk.rda.repatriation"],
    audience: "Non-resident Pakistanis buying property at home",
  },
];

export interface GuideWithRules extends Guide {
  rules: (ComplianceRule & { stale: boolean })[];
  /** True when any cited rule is past its review interval. */
  needsReview: boolean;
  lastReviewedAt: Date;
}

function hydrate(g: Guide): GuideWithRules {
  const rules = g.ruleKeys
    .map((k) => SEED_RULES.find((r) => r.key === k))
    .filter((r): r is ComplianceRule => Boolean(r))
    .map((r) => ({ ...r, stale: isStale(r) }));

  // The guide is only as fresh as its least-recently-reviewed rule.
  const lastReviewedAt = rules.reduce<Date>(
    (acc, r) => (r.lastReviewedAt < acc ? r.lastReviewedAt : acc),
    rules[0]?.lastReviewedAt ?? new Date(),
  );

  return {
    ...g,
    rules,
    needsReview: rules.some((r) => r.stale),
    lastReviewedAt,
  };
}

export async function listGuides(market: Market): Promise<GuideWithRules[]> {
  "use cache";
  cacheLife("complianceRule");
  cacheTag("guides");
  return GUIDES.filter((g) => g.market === market).map(hydrate);
}

export async function getGuide(market: Market, slug: string): Promise<GuideWithRules | null> {
  "use cache";
  cacheLife("complianceRule");
  cacheTag("guides");
  const g = GUIDES.find((x) => x.market === market && x.slug === slug);
  return g ? hydrate(g) : null;
}

export async function allGuideParams(): Promise<{ market: Market; slug: string }[]> {
  "use cache";
  cacheLife("complianceRule");
  return GUIDES.map((g) => ({ market: g.market, slug: g.slug }));
}
