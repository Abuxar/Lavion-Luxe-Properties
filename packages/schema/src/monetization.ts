import { z } from "zod";
import { Currency, Market } from "./market.js";
import type { PromotionTier } from "./listing.js";

/**
 * F09 — the revenue model.
 *
 * What is buildable now: tiers, entitlements, promotion pricing, and the
 * commission/fee arithmetic. What is NOT: charging anyone. Stripe needs a
 * merchant account per market, does not support Pakistan at all, and its
 * Connect marketplace payouts are restricted in the UAE. So this module
 * computes what is owed and records it; collection is a later integration
 * behind a PaymentProvider interface.
 *
 * Keeping the arithmetic here — rather than inline in a checkout flow that
 * does not exist yet — means the numbers are testable today and the payment
 * rail becomes a thin adapter rather than a rewrite.
 */

export const SubscriptionTier = z.enum(["starter", "professional", "enterprise"]);
export type SubscriptionTier = z.infer<typeof SubscriptionTier>;

export interface TierDefinition {
  tier: SubscriptionTier;
  label: string;
  /** Monthly listing allowance. null means uncapped. */
  listingAllowance: number | null;
  /** Included promotion credits per month. */
  includedPromotions: number;
  /** Commission taken on a completed sale, as a fraction. */
  commissionRate: number;
  /** Flat fee on completion, in the market's own currency. */
  closingFee: Record<Market, number>;
  features: string[];
}

export const TIERS: Record<SubscriptionTier, TierDefinition> = {
  starter: {
    tier: "starter",
    label: "Starter",
    listingAllowance: 10,
    includedPromotions: 0,
    commissionRate: 0.025,
    closingFee: { uk: 500, ae: 2500, pk: 75_000 },
    features: ["Up to 10 live listings", "Standard placement", "Lead inbox"],
  },
  professional: {
    tier: "professional",
    label: "Professional",
    listingAllowance: 50,
    includedPromotions: 3,
    commissionRate: 0.02,
    closingFee: { uk: 350, ae: 1800, pk: 50_000 },
    features: [
      "Up to 50 live listings",
      "3 featured promotions monthly",
      "Agency branding on listings",
      "Priority review queue",
    ],
  },
  enterprise: {
    tier: "enterprise",
    label: "Enterprise",
    listingAllowance: null,
    includedPromotions: 12,
    commissionRate: 0.015,
    closingFee: { uk: 0, ae: 0, pk: 0 },
    features: [
      "Unlimited listings",
      "12 promotions monthly",
      "Feed ingestion",
      "Dedicated account manager",
    ],
  },
};

/** Promotion pricing per market, per 30-day placement. */
export const PROMOTION_PRICE: Record<Market, Record<PromotionTier, number>> = {
  uk: { featured: 150, premium: 400, spotlight: 900 },
  ae: { featured: 750, premium: 2000, spotlight: 4500 },
  pk: { featured: 20_000, premium: 55_000, spotlight: 120_000 },
};

export function promotionPrice(market: Market, tier: PromotionTier): number {
  return PROMOTION_PRICE[market][tier];
}

export function promotionCurrency(market: Market): Currency {
  return ({ uk: "GBP", ae: "AED", pk: "PKR" } as const)[market];
}

export const CommissionBreakdown = z.object({
  salePrice: z.number().nonnegative(),
  currency: Currency,
  commissionRate: z.number(),
  commissionAmount: z.number(),
  closingFee: z.number(),
  total: z.number(),
});
export type CommissionBreakdown = z.infer<typeof CommissionBreakdown>;

/**
 * What Lavion Luxe earns on a completed sale under a given tier.
 * Rounded to whole currency units — no market here prices to the cent.
 */
export function calculateCommission(input: {
  salePrice: number;
  market: Market;
  tier: SubscriptionTier;
}): CommissionBreakdown {
  const def = TIERS[input.tier];
  const commissionAmount = Math.round(input.salePrice * def.commissionRate);
  const closingFee = def.closingFee[input.market];

  return {
    salePrice: input.salePrice,
    currency: promotionCurrency(input.market),
    commissionRate: def.commissionRate,
    commissionAmount,
    closingFee,
    total: commissionAmount + closingFee,
  };
}

/** Whether an agency may publish another listing under its allowance. */
export function canPublishMore(tier: SubscriptionTier, liveListings: number): boolean {
  const allowance = TIERS[tier].listingAllowance;
  return allowance === null || liveListings < allowance;
}
