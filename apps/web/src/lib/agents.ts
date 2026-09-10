import type { Market } from "@lavion/schema";
import { brandEmail } from "./brand";
import { WHATSAPP_E164 } from "./contact";

/**
 * F08 — agents and their territories.
 *
 * Routing is by territory metadata rather than round-robin, because a buyer
 * asking about Dubai Marina should reach whoever actually covers Dubai Marina.
 * Match order is locality, then city, then market — so an enquiry always lands
 * somewhere, and lands as precisely as the roster allows.
 *
 * Static for now; becomes an Atlas collection with the rest.
 *
 * Every phone here was a made-up placeholder (+442071234567 and friends), so
 * a WhatsApp enquiry opened a chat with nobody. Until there is a real roster
 * they all point at the one line that is actually answered. Each agent keeps
 * its own field rather than sharing one, so handing a territory to a real
 * agent later is a one-line change and not a refactor.
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
    phone: WHATSAPP_E164,
    email: brandEmail("london"),
    languages: ["English"],
  },
  {
    id: "ag_uk_general",
    name: "James Okonkwo",
    title: "Head of UK Sales",
    market: "uk",
    localities: [],
    cities: [],
    phone: WHATSAPP_E164,
    email: brandEmail("uk"),
    languages: ["English"],
  },
  {
    id: "ag_ae_marina",
    name: "Layla Al Mansouri",
    title: "Senior Consultant, Dubai Marina & Waterfront",
    market: "ae",
    localities: ["Dubai Marina", "Dubai Creek Harbour", "Dubai Maritime City"],
    cities: ["Dubai"],
    phone: WHATSAPP_E164,
    email: brandEmail("marina"),
    languages: ["English", "Arabic"],
  },
  {
    id: "ag_ae_general",
    name: "Omar Haddad",
    title: "Head of UAE Sales",
    market: "ae",
    localities: [],
    cities: [],
    phone: WHATSAPP_E164,
    email: brandEmail("uae"),
    languages: ["English", "Arabic"],
  },
  {
    id: "ag_pk_lahore",
    name: "Bilal Chaudhry",
    title: "Consultant, Lahore",
    market: "pk",
    localities: ["DHA Phase 6", "Bahria Town Phase 8"],
    cities: ["Lahore", "Rawalpindi"],
    phone: WHATSAPP_E164,
    email: brandEmail("lahore"),
    languages: ["English", "Urdu", "Punjabi"],
  },
  {
    id: "ag_pk_general",
    name: "Sana Qureshi",
    title: "Head of Overseas Pakistani Desk",
    market: "pk",
    localities: [],
    cities: [],
    phone: WHATSAPP_E164,
    email: brandEmail("pakistan"),
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
