import "server-only";
import { ListingInput, toSqft } from "@lavion/schema";

/**
 * FormData -> validated ListingInput.
 *
 * Shared so the public submission form and the admin entry form produce
 * exactly the same shape and pass through the same Zod schema. Divergence
 * between the two is how "own listings" and "submitted listings" quietly
 * become different products.
 */
export function buildListingFromForm(
  formData: FormData,
):
  | { ok: true; listing: ListingInput }
  | { ok: false; fieldIssues: Record<string, string> } {
  const get = (k: string) => {
    const v = formData.get(k);
    return v === null || String(v) === "" ? undefined : String(v);
  };
  const num = (k: string) => {
    const v = get(k);
    if (v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const market = (get("market") ?? "uk") as "uk" | "ae" | "pk";
  const areaUnit = (get("areaUnit") ?? "sqft") as "sqft" | "sqm" | "marla" | "kanal";
  const areaValue = num("areaValue") ?? 0;
  const title = get("title") ?? "";
  const tenure = get("tenure") as "freehold" | "leasehold" | "commonhold" | undefined;

  // Media: one image URL per line. Cloudinary public IDs work here too — the
  // custom next/image loader passes absolute URLs and local paths straight
  // through and prefixes anything else with the Cloudinary delivery URL.
  const mediaRaw = get("media") ?? "";
  const media = mediaRaw
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((cloudinaryId, i) => ({
      cloudinaryId,
      order: i,
      type: "image" as const,
      alt: `${title} — image ${i + 1}`,
    }));

  const amenities = (get("amenities") ?? "")
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);

  const lat = num("lat");
  const lng = num("lng");

  const compliance: ListingInput["compliance"] = {};
  if (market === "ae") {
    compliance.ae = {
      permitNumber: get("ae_permitNumber"),
      permitExpiry: get("ae_permitExpiry") ? new Date(get("ae_permitExpiry")!) : undefined,
      developerName: get("ae_developerName"),
      escrowAccount: get("ae_escrowAccount"),
      completionDate: get("ae_completionDate") ? new Date(get("ae_completionDate")!) : undefined,
    };
  }
  if (market === "uk") {
    compliance.uk = {
      councilTaxBand: get("uk_councilTaxBand"),
      tenureDetail: tenure,
      epcRating: get("uk_epcRating"),
      constructionMaterials: get("uk_constructionMaterials"),
      parking: get("uk_parking"),
      affectedByIssues: [],
      leaseholdYearsRemaining: num("uk_leaseholdYearsRemaining"),
      serviceChargeAnnual: num("uk_serviceChargeAnnual"),
      groundRentAnnual: num("uk_groundRentAnnual"),
    };
  }
  if (market === "pk") {
    compliance.pk = {
      societyName: get("pk_societyName"),
      societyApprovalRef: get("pk_societyApprovalRef"),
      transferAuthority: get("pk_transferAuthority"),
    };
  }

  const slugBase =
    get("slug") ??
    `${title} ${get("locality") ?? ""}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 70);

  const addressLines = (get("addressLine") ?? get("locality") ?? "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const candidate = {
    slug: slugBase,
    title,
    description: get("description") ?? "",
    source: "admin_entry" as const,
    status: "draft" as const,
    market,
    agents: [],
    transaction: (get("transaction") ?? "sale") as "sale" | "rent",
    category: get("category") ?? "apartment",
    offPlan: get("offPlan") === "on",
    price: {
      amount: num("amount") ?? 0,
      currency: (market === "uk" ? "GBP" : market === "ae" ? "AED" : "PKR") as
        | "GBP"
        | "AED"
        | "PKR",
      qualifier: (get("qualifier") ?? "asking") as
        | "asking"
        | "offers_over"
        | "offers_in_region"
        | "poa"
        | "from",
    },
    area: { value: areaValue, unit: areaUnit, canonicalSqft: toSqft(areaValue, areaUnit) },
    bedrooms: num("bedrooms"),
    bathrooms: num("bathrooms"),
    tenure,
    location: {
      addressLines: addressLines.length ? addressLines : [get("city") ?? ""],
      locality: get("locality") ?? "",
      city: get("city") ?? "",
      region: get("region"),
      postcode: get("postcode"),
      freeholdZone: get("freeholdZone") === "on",
      ...(lat !== undefined && lng !== undefined ? { geo: { lat, lng } } : {}),
    },
    amenities,
    media,
    compliance,
    priceHistory: [],
  };

  const parsed = ListingInput.safeParse(candidate);
  if (!parsed.success) {
    const fieldIssues: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldIssues[issue.path.join(".")] = issue.message;
    }
    return { ok: false, fieldIssues };
  }
  return { ok: true, listing: parsed.data };
}
