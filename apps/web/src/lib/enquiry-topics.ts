import { MARKETS, type Market } from "@lavion/schema";

/**
 * The questions people actually open WhatsApp to ask.
 *
 * A single prefilled "Hello, I'd like to ask about a property" puts the work
 * back on the sender: they have to delete it and type the real question, and
 * the agent receives a message with no subject. Offering the question instead
 * means the first message already says what it is about, which is the whole
 * point of a prefilled deep link.
 *
 * Topics are market-aware because the questions genuinely differ. A Dubai
 * buyer asks about the Golden Visa threshold, a Pakistani overseas buyer about
 * Roshan Digital Account repatriation, a UK buyer about the surcharge — and
 * offering the wrong three is worse than offering none, because it signals the
 * site does not understand their market.
 *
 * Listing context is appended rather than baked into each message, so the
 * topic list stays the same shape whether or not a property is in view.
 */

export interface EnquiryTopic {
  id: string;
  /** Shown in the picker. Keep it short — this is a menu, not a form. */
  label: string;
  /** The message the sender can still edit before sending. */
  message: string;
}

export interface ListingContext {
  title: string;
  url: string;
  /** Formatted for reading, e.g. "AED 2,400,000". */
  price?: string;
  locality?: string;
  city?: string;
}

/** Questions that only make sense with a specific property in view. */
function listingTopics(l: ListingContext): EnquiryTopic[] {
  // Trim before joining: submitted listings carry whatever whitespace the
  // seller typed, and an untrimmed value renders as "Gulberg , Lahore".
  const where = [l.locality, l.city]
    .map((x) => x?.trim())
    .filter(Boolean)
    .join(", ");
  return [
    {
      id: "available",
      label: "Is this still available?",
      message: `Hello, is "${l.title}"${where ? ` in ${where}` : ""} still available?`,
    },
    {
      id: "viewing",
      label: "Arrange a viewing",
      message: `Hello, I'd like to arrange a viewing for "${l.title}". When are you free?`,
    },
    {
      id: "price",
      label: "Price and payment plan",
      message: `Hello, could you tell me about the price${l.price ? ` (listed at ${l.price})` : ""} and any payment plan for "${l.title}"?`,
    },
    {
      id: "media",
      label: "More photos or floor plan",
      message: `Hello, could you send more photos, a floor plan or a video tour of "${l.title}"?`,
    },
  ];
}

/** Questions that stand on their own anywhere on the site. */
function generalTopics(market: Market): EnquiryTopic[] {
  const m = MARKETS[market].label;
  return [
    {
      id: "find",
      label: "Help me find a property",
      message: `Hello, I'm looking for a property in ${m}. Could you help me find something suitable?`,
    },
    {
      id: "sell",
      label: "I want to list my property",
      message: `Hello, I'd like to list my property in ${m}. What do you need from me?`,
    },
    {
      id: "valuation",
      label: "What is my property worth?",
      message: `Hello, I'd like a valuation for my property in ${m}.`,
    },
  ];
}

/**
 * One market-specific question each. These are the recurring ones for
 * cross-border buyers, and they are the reason this list is not generic.
 */
const MARKET_TOPIC: Record<Market, EnquiryTopic> = {
  ae: {
    id: "golden-visa",
    label: "Golden Visa eligibility",
    message:
      "Hello, I'd like to understand which properties qualify for the UAE Golden Visa, and what the AED 2,000,000 threshold means in practice.",
  },
  pk: {
    id: "overseas-pk",
    label: "Buying from overseas",
    message:
      "Hello, I'm an overseas Pakistani. Could you explain buying through a Roshan Digital Account, and how repatriating the proceeds works?",
  },
  uk: {
    id: "overseas-uk",
    label: "Costs for overseas buyers",
    message:
      "Hello, I'm buying from outside the UK. Could you explain the stamp duty surcharge and what else I should budget for?",
  },
};

/**
 * The picker's contents for a given page.
 *
 * Listing questions come first where there is a listing, because someone on a
 * property page is almost always asking about that property.
 */
export function enquiryTopics(
  market: Market,
  listing?: ListingContext,
): EnquiryTopic[] {
  const topics = listing
    ? [...listingTopics(listing), MARKET_TOPIC[market]]
    : [...generalTopics(market), MARKET_TOPIC[market]];

  if (!listing) return topics;

  // The link belongs on the end of every listing message, not inside each one.
  return topics.map((t) => ({ ...t, message: `${t.message}\n${listing.url}` }));
}
