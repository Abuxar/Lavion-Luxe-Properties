import type { Market } from "@lavion/schema";

/**
 * F08 — agents and their territories.
 *
 * Routing is by territory metadata rather than round-robin, because a buyer
 * asking about Dubai Marina should reach whoever actually covers Dubai Marina.
 * Match order is locality, then city, then market — so an enquiry always lands
 * somewhere, and lands as precisely as the roster allows.
 *
 * Static for now; becomes an Atlas collection with the rest.
 */
export interface Agent {
  id: string;
  name: string;
  title: string;
  market: Market;
  /** Localities this agent owns. Empty means market-wide cover. */
  localities: string[];
  cities: string[];
  /** E.164, used for the WhatsApp deep link. */
  phone: string;
  email: string;
  languages: string[];
}

export const AGENTS: Agent[] = [
  {
    id: "ag_uk_london",
    name: "Eleanor Whitfield",
    title: "Director, Prime Central London",
    market: "uk",
    localities: ["Chelsea", "Marylebone", "Wapping"],
    cities: ["London"],
    phone: "+442071234567",
    email: "london@lavionluxe.com",
    languages: ["English"],
  },
  {
    id: "ag_uk_general",
    name: "James Okonkwo",
    title: "Head of UK Sales",
    market: "uk",
    localities: [],
    cities: [],
    phone: "+442071234568",
    email: "uk@lavionluxe.com",
    languages: ["English"],
  },
  {
    id: "ag_ae_marina",
    name: "Layla Al Mansouri",
    title: "Senior Consultant, Dubai Marina & Waterfront",
    market: "ae",
    localities: ["Dubai Marina", "Dubai Creek Harbour", "Dubai Maritime City"],
    cities: ["Dubai"],
    phone: "+971501234567",
    email: "marina@lavionluxe.com",
    languages: ["English", "Arabic"],
  },
  {
    id: "ag_ae_general",
    name: "Omar Haddad",
    title: "Head of UAE Sales",
    market: "ae",
    localities: [],
    cities: [],
    phone: "+971501234568",
    email: "uae@lavionluxe.com",
    languages: ["English", "Arabic"],
  },
  {
    id: "ag_pk_lahore",
    name: "Bilal Chaudhry",
    title: "Consultant, Lahore",
    market: "pk",
    localities: ["DHA Phase 6", "Bahria Town Phase 8"],
    cities: ["Lahore", "Rawalpindi"],
    phone: "+923001234567",
    email: "lahore@lavionluxe.com",
    languages: ["English", "Urdu", "Punjabi"],
  },
  {
    id: "ag_pk_general",
    name: "Sana Qureshi",
    title: "Head of Overseas Pakistani Desk",
    market: "pk",
    localities: [],
    cities: [],
    phone: "+923001234568",
    email: "pakistan@lavionluxe.com",
    languages: ["English", "Urdu"],
  },
];

/**
 * Most specific territory wins: locality, then city, then market-wide.
 * Never returns nothing for a valid market — an unrouted enquiry is a lost one.
 */
export function routeToAgent(
  market: Market,
  location?: { locality?: string; city?: string },
): Agent {
  const inMarket = AGENTS.filter((a) => a.market === market);

  if (location?.locality) {
    const byLocality = inMarket.find((a) => a.localities.includes(location.locality!));
    if (byLocality) return byLocality;
  }
  if (location?.city) {
    const byCity = inMarket.find((a) => a.cities.includes(location.city!));
    if (byCity) return byCity;
  }
  return inMarket.find((a) => a.localities.length === 0) ?? inMarket[0];
}

export function getAgent(id: string): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}
