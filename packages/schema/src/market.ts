import { z } from "zod";

/**
 * A market is a jurisdiction, not a language. All three launch in English;
 * what differs is currency, units, address shape, and the rules in publish-gates.ts.
 */
export const Market = z.enum(["uk", "ae", "pk"]);
export type Market = z.infer<typeof Market>;

export const Currency = z.enum(["GBP", "AED", "PKR"]);
export type Currency = z.infer<typeof Currency>;

/** Marla and Kanal are Pakistan-only. Everything is normalised to sq ft on write. */
export const AreaUnit = z.enum(["sqft", "sqm", "marla", "kanal"]);
export type AreaUnit = z.infer<typeof AreaUnit>;

export const MARKETS: Record<
  Market,
  {
    label: string;
    currency: Currency;
    currencySymbol: string;
    locale: string;
    displayUnit: AreaUnit;
    /** Dial code used to build WhatsApp deep links. */
    dialCode: string;
  }
> = {
  uk: {
    label: "United Kingdom",
    currency: "GBP",
    currencySymbol: "£",
    locale: "en-GB",
    displayUnit: "sqft",
    dialCode: "44",
  },
  ae: {
    label: "United Arab Emirates",
    currency: "AED",
    currencySymbol: "AED",
    locale: "en-AE",
    displayUnit: "sqft",
    dialCode: "971",
  },
  pk: {
    label: "Pakistan",
    currency: "PKR",
    currencySymbol: "Rs",
    locale: "en-PK",
    displayUnit: "marla",
    dialCode: "92",
  },
};

/**
 * Marla is NOT standardised. Punjab/urban convention is 225 sq ft; the older
 * revenue-record figure is 272.25 sq ft and still circulates in rural records.
 * We store canonicalSqft computed at write time with an explicit basis so a
 * later correction can be applied to the right subset instead of guessing.
 */
export const MARLA_BASIS = {
  punjab_225: 225,
  legacy_272: 272.25,
} as const;
export type MarlaBasis = keyof typeof MARLA_BASIS;

const SQM_TO_SQFT = 10.7639;

export function toSqft(
  value: number,
  unit: AreaUnit,
  marlaBasis: MarlaBasis = "punjab_225",
): number {
  switch (unit) {
    case "sqft":
      return value;
    case "sqm":
      return value * SQM_TO_SQFT;
    case "marla":
      return value * MARLA_BASIS[marlaBasis];
    case "kanal":
      // 1 Kanal = 20 Marla, in every basis.
      return value * 20 * MARLA_BASIS[marlaBasis];
  }
}

export function fromSqft(
  sqft: number,
  unit: AreaUnit,
  marlaBasis: MarlaBasis = "punjab_225",
): number {
  switch (unit) {
    case "sqft":
      return sqft;
    case "sqm":
      return sqft / SQM_TO_SQFT;
    case "marla":
      return sqft / MARLA_BASIS[marlaBasis];
    case "kanal":
      return sqft / (20 * MARLA_BASIS[marlaBasis]);
  }
}
