"use server";

import { revalidatePath } from "next/cache";
import { toSqft, type AreaUnit, type Market } from "@lavion/schema";
import { routeToAgent } from "@/lib/agents";
import { createLead, estimateValue, type ValuationEstimate } from "@/lib/leads";

export type LeadState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ok"; message: string; agentName: string }
  | {
      status: "valued";
      message: string;
      agentName: string;
      estimate: ValuationEstimate | null;
    };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(f: FormData, k: string): string {
  return String(f.get(k) ?? "").trim();
}

/* ---------- enquiry / viewing on a listing (F08) ---------- */

export async function submitEnquiryAction(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const market = str(formData, "market") as Market;
  const name = str(formData, "name");
  const email = str(formData, "email");

  if (name.length < 2) return { status: "error", message: "Please give us a name." };
  if (!EMAIL.test(email))
    return { status: "error", message: "That email address does not look right." };

  const kind = str(formData, "kind") === "viewing" ? "viewing" : "enquiry";
  const locality = str(formData, "locality");
  const city = str(formData, "city");

  await createLead({
    kind,
    channel: "form",
    market,
    name,
    email,
    phone: str(formData, "phone") || undefined,
    message: str(formData, "message") || undefined,
    listingSlug: str(formData, "listingSlug") || undefined,
    listingTitle: str(formData, "listingTitle") || undefined,
    locality: locality || undefined,
    city: city || undefined,
    preferredDate: str(formData, "preferredDate") || undefined,
  });

  const agent = routeToAgent(market, { locality, city });
  revalidatePath("/admin/leads");

  return {
    status: "ok",
    agentName: agent.name,
    message:
      kind === "viewing"
        ? "Viewing request received."
        : "Thank you — your enquiry is with our team.",
  };
}

/* ---------- valuation request (F02) ---------- */

export async function requestValuationAction(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const market = str(formData, "market") as Market;
  const name = str(formData, "name");
  const email = str(formData, "email");

  if (name.length < 2) return { status: "error", message: "Please give us a name." };
  if (!EMAIL.test(email))
    return { status: "error", message: "That email address does not look right." };

  const locality = str(formData, "locality");
  const city = str(formData, "city");
  if (!locality || !city)
    return { status: "error", message: "We need the area and city to find comparables." };

  const areaValue = Number(str(formData, "areaValue"));
  const areaUnit = (str(formData, "areaUnit") || "sqft") as AreaUnit;
  if (!Number.isFinite(areaValue) || areaValue <= 0)
    return { status: "error", message: "Enter the property size." };

  const estimate = await estimateValue({ market, locality, city, areaValue, areaUnit });

  await createLead({
    kind: "valuation",
    channel: "form",
    market,
    name,
    email,
    phone: str(formData, "phone") || undefined,
    message: str(formData, "message") || undefined,
    locality,
    city,
    valuation: {
      addressLine: str(formData, "addressLine"),
      locality,
      city,
      category: str(formData, "category") || "apartment",
      bedrooms: Number(str(formData, "bedrooms")) || undefined,
      areaValue,
      areaUnit,
      canonicalSqft: toSqft(areaValue, areaUnit),
      estimate: estimate ?? undefined,
    },
  });

  const agent = routeToAgent(market, { locality, city });
  revalidatePath("/admin/leads");

  return {
    status: "valued",
    agentName: agent.name,
    estimate,
    message: "Request received. An appraisal will follow.",
  };
}
