import { MARKETS, fromSqft, type AreaUnit, type Market } from "@lavion/schema";

/**
 * Display formatting. The rule throughout: show the native figure the seller
 * set, in the local convention. Never render a converted price as the asking
 * price — in all three markets the legal price is the native one.
 */

export function formatPrice(
  amount: number,
  currency: string,
  market: Market,
  opts: { compact?: boolean } = {},
): string {
  const { locale } = MARKETS[market];
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: opts.compact ? "compact" : "standard",
  }).format(amount);
}

/** Renders area in the market's own convention — Marla/Kanal for Pakistan. */
export function formatArea(canonicalSqft: number, market: Market): string {
  const unit = MARKETS[market].displayUnit;
  const value = fromSqft(canonicalSqft, unit);

  if (unit === "marla") {
    // Above 20 Marla, Pakistani listings are quoted in Kanal.
    if (value >= 20) {
      const kanal = fromSqft(canonicalSqft, "kanal");
      return `${trim(kanal)} Kanal`;
    }
    return `${trim(value)} Marla`;
  }
  if (unit === "sqm") return `${Math.round(value).toLocaleString()} m²`;
  return `${Math.round(value).toLocaleString()} sq ft`;
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatUnit(unit: AreaUnit): string {
  return { sqft: "sq ft", sqm: "m²", marla: "Marla", kanal: "Kanal" }[unit];
}

/**
 * WhatsApp deep link. In the UAE and Pakistan this is the default channel for
 * a serious enquiry and converts substantially better than a contact form —
 * which is why it ships in Phase 1 rather than as a growth experiment.
 */
export function whatsappLink(
  phone: string,
  listingTitle: string,
  listingUrl: string,
): string {
  const digits = phone.replace(/[^\d]/g, "");
  const text = encodeURIComponent(
    `Hello, I'd like to arrange a viewing for "${listingTitle}".\n${listingUrl}`,
  );
  return `https://wa.me/${digits}?text=${text}`;
}

export function statusLabel(status: string): string {
  return (
    {
      published: "Available",
      sold: "Sold",
      let: "Let",
      expired: "Withdrawn",
      pending_review: "In review",
    }[status] ?? status
  );
}
