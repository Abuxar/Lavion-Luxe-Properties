import type { Market } from "@lavion/schema";

/**
 * Where a property can be — the location hierarchy the search filter offers.
 *
 * Region → city → area, per market: emirates in the UAE, the four nations in
 * the UK, provinces in Pakistan. Before this the Area filter was built only
 * from live inventory, so it could only ever offer the handful of places that
 * happened to have a listing, and a buyer looking for Leith or Saadiyat was
 * told, in effect, that the place did not exist.
 *
 * Offering areas with nothing in them is deliberate. A zero-result search with
 * "save this search" is how the demand-by-area report learns what to onboard
 * next — an area people keep asking for and nobody supplies is the clearest
 * signal the platform gets.
 *
 * Pakistan is Defence-only for now, on instruction: DHA schemes and phases. A
 * Pakistani listing outside DHA (Clifton, Bahria) is still found by its city;
 * it simply has no area option until that market's list is widened.
 *
 * Listings store free-text city and locality, so `resolvePlace` maps them onto
 * this tree rather than requiring every listing to carry an id. That keeps
 * existing inventory, feeds and saved searches working unchanged.
 *
 * Plain data and no value imports: the search module that uses this is also
 * imported by client components.
 */

export interface Place {
  name: string;
  /** Other spellings a listing might use — "JBR", "Newcastle", "RAK". */
  aliases?: string[];
}

export interface GazetteerCity extends Place {
  areas: Place[];
}

export interface GazetteerRegion extends Place {
  cities: GazetteerCity[];
}

export interface MarketGazetteer {
  /** What the top level is called in this market. */
  regionLabel: string;
  regionLabelPlural: string;
  /**
   * Whether live inventory may add areas and cities the list does not name.
   * On for the UAE and UK, so no listing becomes unreachable by the filter.
   * Off for Pakistan, where the instruction is DHA areas only.
   */
  extendFromInventory: boolean;
  regions: GazetteerRegion[];
}

const areas = (...names: string[]): Place[] => names.map((name) => ({ name }));

/** "DHA Phase 1" … "DHA Phase n". */
const dhaPhases = (n: number): Place[] =>
  Array.from({ length: n }, (_, i) => ({ name: `DHA Phase ${i + 1}` }));

export const GAZETTEER: Record<Market, MarketGazetteer> = {
  ae: {
    regionLabel: "Emirate",
    regionLabelPlural: "emirates",
    extendFromInventory: true,
    regions: [
      {
        name: "Dubai",
        cities: [
          {
            name: "Dubai",
            areas: [
              ...areas(
                "Al Barsha",
                "Al Furjan",
                "Al Jaddaf",
                "Al Sufouh",
                "Arabian Ranches",
                "Arjan",
                "Bluewaters Island",
                "Business Bay",
                "City Walk",
                "DAMAC Hills",
                "DAMAC Hills 2",
                "Deira",
                "Dubai Harbour",
                "Dubai Maritime City",
                "Dubai Silicon Oasis",
                "Dubai South",
                "Emirates Hills",
                "International City",
                "Jumeirah",
                "Jumeirah Golf Estates",
                "Jumeirah Islands",
                "Jumeirah Park",
                "La Mer",
                "Meydan",
                "Mirdif",
                "Motor City",
                "Sobha Hartland",
                "The Greens",
                "The Lakes",
                "The Meadows",
                "The Springs",
                "The Valley",
                "Tilal Al Ghaf",
                "Town Square",
                "Umm Suqeim",
              ),
              { name: "DIFC", aliases: ["Dubai International Financial Centre"] },
              { name: "Downtown Dubai", aliases: ["Downtown"] },
              { name: "Dubai Creek Harbour", aliases: ["Creek Harbour"] },
              { name: "Dubai Hills Estate", aliases: ["Dubai Hills"] },
              { name: "Dubai Marina", aliases: ["Marina"] },
              { name: "Dubai Sports City", aliases: ["Sports City"] },
              { name: "Jumeirah Beach Residence", aliases: ["JBR"] },
              { name: "Jumeirah Lake Towers", aliases: ["JLT"] },
              { name: "Jumeirah Village Circle", aliases: ["JVC"] },
              { name: "Jumeirah Village Triangle", aliases: ["JVT"] },
              { name: "Mohammed Bin Rashid City", aliases: ["MBR City"] },
              { name: "Palm Jumeirah", aliases: ["The Palm"] },
            ],
          },
        ],
      },
      {
        name: "Abu Dhabi",
        cities: [
          {
            name: "Abu Dhabi",
            areas: [
              ...areas(
                "Al Bateen",
                "Al Ghadeer",
                "Al Jubail Island",
                "Al Maryah Island",
                "Al Raha Beach",
                "Al Raha Gardens",
                "Al Reef",
                "Al Shamkha",
                "Corniche",
                "Hydra Village",
                "Khalifa City",
                "Masdar City",
              ),
              { name: "Al Reem Island", aliases: ["Reem Island"] },
              { name: "Mohammed Bin Zayed City", aliases: ["MBZ City"] },
              { name: "Saadiyat Island", aliases: ["Saadiyat"] },
              { name: "Yas Island", aliases: ["Yas"] },
            ],
          },
          {
            name: "Al Ain",
            areas: areas("Al Hili", "Al Jimi", "Al Khabisi", "Al Muwaiji", "Al Towayya", "Zakher"),
          },
        ],
      },
      {
        name: "Sharjah",
        cities: [
          {
            name: "Sharjah",
            areas: areas(
              "Al Khan",
              "Al Majaz",
              "Al Nahda",
              "Al Qasimia",
              "Al Taawun",
              "Al Zahia",
              "Aljada",
              "Maryam Island",
              "Muwaileh",
              "Sharjah Sustainable City",
              "Sharjah Waterfront City",
              "Tilal City",
            ),
          },
        ],
      },
      {
        name: "Ajman",
        cities: [
          {
            name: "Ajman",
            areas: areas(
              "Ajman Downtown",
              "Al Helio",
              "Al Jurf",
              "Al Nuaimiya",
              "Al Rashidiya",
              "Al Rawda",
              "Al Yasmeen",
              "Al Zorah",
              "Emirates City",
            ),
          },
        ],
      },
      {
        name: "Ras Al Khaimah",
        cities: [
          {
            name: "Ras Al Khaimah",
            aliases: ["RAK"],
            areas: areas(
              "Al Dhait",
              "Al Hamra Village",
              "Al Marjan Island",
              "Al Nakheel",
              "Julphar",
              "Mina Al Arab",
              "Yasmin Village",
            ),
          },
        ],
      },
      {
        name: "Umm Al Quwain",
        cities: [
          {
            name: "Umm Al Quwain",
            aliases: ["UAQ"],
            areas: [{ name: "Umm Al Quwain Marina", aliases: ["UAQ Marina"] }, { name: "Al Salam City" }],
          },
        ],
      },
      {
        name: "Fujairah",
        cities: [
          {
            name: "Fujairah",
            areas: areas("Al Aqah", "Al Faseel", "Dibba", "Merashid"),
          },
        ],
      },
    ],
  },

  uk: {
    regionLabel: "Country",
    regionLabelPlural: "countries",
    extendFromInventory: true,
    regions: [
      {
        name: "England",
        cities: [
          {
            name: "London",
            areas: areas(
              "Battersea",
              "Belgravia",
              "Canary Wharf",
              "Chelsea",
              "Clapham",
              "Covent Garden",
              "Fulham",
              "Greenwich",
              "Hampstead",
              "Highgate",
              "Holland Park",
              "Islington",
              "Kensington",
              "King's Cross",
              "Knightsbridge",
              "Marylebone",
              "Mayfair",
              "Nine Elms",
              "Notting Hill",
              "Primrose Hill",
              "Richmond",
              "Shoreditch",
              "South Kensington",
              "St John's Wood",
              "Wapping",
              "Westminster",
              "Wimbledon",
            ),
          },
          {
            name: "Manchester",
            areas: areas(
              "Ancoats",
              "Castlefield",
              "Chorlton",
              "Deansgate",
              "Didsbury",
              "Northern Quarter",
              "Salford Quays",
              "Spinningfields",
            ),
          },
          {
            name: "Birmingham",
            areas: areas(
              "Brindleyplace",
              "Digbeth",
              "Edgbaston",
              "Harborne",
              "Jewellery Quarter",
              "Moseley",
              "Sutton Coldfield",
            ),
          },
          {
            name: "Liverpool",
            areas: areas("Albert Dock", "Allerton", "Baltic Triangle", "Georgian Quarter", "Liverpool One", "Woolton"),
          },
          {
            name: "Leeds",
            areas: areas("Chapel Allerton", "Headingley", "Holbeck", "Leeds Dock", "Roundhay"),
          },
          {
            name: "Bristol",
            areas: areas("Clifton", "Cotham", "Harbourside", "Redland", "Southville"),
          },
          {
            name: "Newcastle upon Tyne",
            aliases: ["Newcastle"],
            areas: areas("Gosforth", "Heaton", "Jesmond", "Quayside"),
          },
          { name: "Oxford", areas: areas("Headington", "Jericho", "North Oxford", "Summertown") },
          { name: "Cambridge", areas: areas("Chesterton", "Mill Road", "Newnham", "Trumpington") },
          { name: "Bath", areas: areas("Bathwick", "Combe Down", "Lansdown", "Widcombe") },
          { name: "Brighton", areas: areas("Hove", "Kemp Town", "Seven Dials", "The Lanes") },
        ],
      },
      {
        name: "Scotland",
        cities: [
          {
            name: "Edinburgh",
            areas: areas(
              "Bruntsfield",
              "Leith",
              "Marchmont",
              "Morningside",
              "New Town",
              "Old Town",
              "Portobello",
              "Stockbridge",
            ),
          },
          {
            name: "Glasgow",
            areas: areas("Dennistoun", "Finnieston", "Merchant City", "Shawlands", "Southside", "West End"),
          },
          { name: "Aberdeen", areas: areas("Cults", "Old Aberdeen", "West End") },
          { name: "Dundee", areas: areas("Broughty Ferry", "West End") },
        ],
      },
      {
        name: "Wales",
        cities: [
          { name: "Cardiff", areas: areas("Canton", "Cardiff Bay", "Llandaff", "Pontcanna", "Roath") },
          { name: "Swansea", areas: areas("Mumbles", "SA1 Waterfront", "Sketty", "Uplands") },
        ],
      },
      {
        name: "Northern Ireland",
        cities: [
          {
            name: "Belfast",
            areas: areas("Cathedral Quarter", "Malone", "Queen's Quarter", "Stranmillis", "Titanic Quarter"),
          },
        ],
      },
    ],
  },

  pk: {
    regionLabel: "Province",
    regionLabelPlural: "provinces",
    extendFromInventory: false,
    regions: [
      {
        name: "Punjab",
        cities: [
          {
            name: "Lahore",
            areas: [
              ...dhaPhases(8),
              { name: "DHA Phase 9 Prism", aliases: ["DHA Prism"] },
              { name: "DHA Phase 9 Town", aliases: ["DHA 9 Town"] },
              { name: "DHA Phase 10" },
              // Usually written as just the phase number, so that resolves too.
              // Phase 9 alone is left ambiguous on purpose: Prism and Town are
              // different schemes, and guessing would misfile half of them.
              { name: "DHA Phase 11 Rahbar", aliases: ["DHA Rahbar", "DHA Phase 11"] },
              { name: "DHA Phase 12 EME", aliases: ["DHA EME", "DHA Phase 12"] },
              { name: "DHA Phase 13" },
            ],
          },
          // Single-scheme cities: a listing that just says "DHA" there can
          // only mean the one scheme, so the bare name resolves.
          { name: "Multan", areas: [{ name: "DHA Multan", aliases: ["DHA"] }] },
          { name: "Bahawalpur", areas: [{ name: "DHA Bahawalpur", aliases: ["DHA"] }] },
          { name: "Gujranwala", areas: [{ name: "DHA Gujranwala", aliases: ["DHA"] }] },
        ],
      },
      {
        name: "Sindh",
        cities: [
          {
            name: "Karachi",
            areas: [
              { name: "DHA Phase 1" },
              { name: "DHA Phase 2" },
              { name: "DHA Phase 2 Extension" },
              { name: "DHA Phase 3" },
              { name: "DHA Phase 4" },
              { name: "DHA Phase 5" },
              { name: "DHA Phase 6" },
              { name: "DHA Phase 7" },
              { name: "DHA Phase 7 Extension" },
              { name: "DHA Phase 8" },
              { name: "DHA City Karachi", aliases: ["DHA City"] },
            ],
          },
        ],
      },
      {
        name: "Islamabad Capital Territory",
        cities: [
          {
            name: "Islamabad",
            areas: [...dhaPhases(5), { name: "DHA Valley" }],
          },
        ],
      },
      {
        name: "Khyber Pakhtunkhwa",
        cities: [{ name: "Peshawar", areas: [{ name: "DHA Peshawar", aliases: ["DHA"] }] }],
      },
      {
        name: "Balochistan",
        cities: [{ name: "Quetta", areas: [{ name: "DHA Quetta", aliases: ["DHA"] }] }],
      },
    ],
  },
};

/* ---------- matching free text onto the tree ---------- */

/**
 * Lowercased words, punctuation dropped, with the synonyms listings actually
 * use folded together: "Defence"/"Defense" are DHA, "Ph" is Phase. Repeated
 * words collapse, so "DHA Defence Phase 6" reads the same as "DHA Phase 6".
 */
function tokens(s: string): string[] {
  const out: string[] = [];
  const words = s
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ");
  for (const raw of words) {
    if (!raw) continue;
    const w = raw === "defence" || raw === "defense" ? "dha" : raw === "ph" ? "phase" : raw;
    if (out[out.length - 1] !== w) out.push(w);
  }
  return out;
}

/**
 * Whether `needle` appears as a contiguous run of whole words in `hay`.
 *
 * Whole words, not substrings: as substrings "DHA Phase 1" is inside
 * "DHA Phase 12", and "Kensington" inside "South Kensington".
 */
function containsRun(hay: string[], needle: string[]): boolean {
  if (!needle.length || needle.length > hay.length) return false;
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

const nameTokens = new WeakMap<Place, string[][]>();
function candidates(p: Place): string[][] {
  let t = nameTokens.get(p);
  if (!t) {
    t = [p.name, ...(p.aliases ?? [])].map(tokens);
    nameTokens.set(p, t);
  }
  return t;
}

/**
 * The place whose name (or alias) is the LONGEST whole-word run found in the
 * text. Longest wins so "Meydan District 11" is Meydan, "Palm Jumeirah" beats
 * "Jumeirah", and "DHA Phase 7 Extension" beats "DHA Phase 7".
 */
function best<T extends Place>(text: string, places: T[]): T | undefined {
  const hay = tokens(text);
  let found: T | undefined;
  let len = 0;
  for (const p of places) {
    for (const c of candidates(p)) {
      if (c.length > len && containsRun(hay, c)) {
        found = p;
        len = c.length;
      }
    }
  }
  return found;
}

export interface ResolvedPlace {
  region?: string;
  city?: string;
  area?: string;
}

const resolved = new Map<string, ResolvedPlace>();

/**
 * Map a listing's free-text city and locality onto the gazetteer.
 *
 * The area is looked for only inside the resolved city — "DHA Phase 6" exists
 * in both Lahore and Karachi, and "West End" in three Scottish cities.
 * Anything that does not resolve is left undefined, and the caller falls back
 * to comparing the raw text, so nothing that matched before stops matching.
 */
export function resolvePlace(market: Market, city: string, locality: string): ResolvedPlace {
  const key = `${market} ${city} ${locality}`;
  const hit = resolved.get(key);
  if (hit) return hit;

  const g = GAZETTEER[market];
  const cities = g.regions.flatMap((r) => r.cities.map((c) => ({ ...c, region: r.name })));

  // The city field first; failing that the locality, which sometimes carries
  // it ("Dubai Marina, Dubai") when the city field holds a country or is blank.
  const c = best(city, cities) ?? best(locality, cities);

  const out: ResolvedPlace = {};
  if (c) {
    out.region = c.region;
    out.city = c.name;
    const a = best(locality, c.areas);
    if (a) out.area = a.name;
  }

  if (resolved.size > 5_000) resolved.clear();
  resolved.set(key, out);
  return out;
}

/* ---------- the filter's view: the tree with live counts ---------- */

export interface LocationOption {
  name: string;
  count: number;
}

export interface CityNode extends LocationOption {
  areas: LocationOption[];
}

export interface RegionNode extends LocationOption {
  cities: CityNode[];
  /**
   * Cities from live inventory that the gazetteer does not name. Shown so
   * those listings stay reachable, but not offered as a region to pick.
   */
  other?: boolean;
}

export interface LocationTree {
  regionLabel: string;
  regionLabelPlural: string;
  regions: RegionNode[];
}

/** Areas read in alphabetical order, with phase numbers in numeric order. */
const byName = (a: LocationOption, b: LocationOption) =>
  a.name.localeCompare(b.name, "en", { numeric: true });

/**
 * Every place in the market, each with how many live listings it holds.
 *
 * Serialisable on purpose: the search page builds this on the server and hands
 * it to the filter component, so the client never downloads the gazetteer for
 * the other two markets.
 */
export function buildLocationTree(
  market: Market,
  rows: { location: { city: string; locality: string } }[],
): LocationTree {
  const g = GAZETTEER[market];
  const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  const pair = (city: string, area: string) => `${city} ${area}`;

  const regionCount = new Map<string, number>();
  const cityCount = new Map<string, number>();
  const areaCount = new Map<string, number>();
  const extraAreas = new Map<string, Map<string, number>>();
  const extraCities = new Map<string, number>();

  for (const l of rows) {
    const p = resolvePlace(market, l.location.city, l.location.locality);

    if (!p.city) {
      const raw = l.location.city.trim();
      if (g.extendFromInventory && raw) inc(extraCities, raw);
      continue;
    }

    inc(regionCount, p.region!);
    inc(cityCount, p.city);

    if (p.area) {
      inc(areaCount, pair(p.city, p.area));
    } else if (g.extendFromInventory) {
      const raw = l.location.locality.trim();
      if (raw) {
        const m = extraAreas.get(p.city) ?? new Map<string, number>();
        inc(m, raw);
        extraAreas.set(p.city, m);
      }
    }
  }

  const regions: RegionNode[] = g.regions.map((r) => ({
    name: r.name,
    count: regionCount.get(r.name) ?? 0,
    // Cities keep the gazetteer's order — biggest market first — because a
    // short list is scanned by prominence. Areas are long, so alphabetical.
    cities: r.cities.map((c) => {
      const list: LocationOption[] = c.areas.map((a) => ({
        name: a.name,
        count: areaCount.get(pair(c.name, a.name)) ?? 0,
      }));
      for (const [name, count] of extraAreas.get(c.name) ?? []) list.push({ name, count });
      return { name: c.name, count: cityCount.get(c.name) ?? 0, areas: list.sort(byName) };
    }),
  }));

  if (extraCities.size) {
    const cities = [...extraCities].map(([name, count]) => ({ name, count, areas: [] }));
    regions.push({
      name: "Other",
      count: cities.reduce((s, c) => s + c.count, 0),
      cities: cities.sort(byName),
      other: true,
    });
  }

  return { regionLabel: g.regionLabel, regionLabelPlural: g.regionLabelPlural, regions };
}
