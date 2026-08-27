"use server";

import { revalidatePath, updateTag } from "next/cache";
import { ListingInput, evaluatePublishGates, toSqft } from "@lavion/schema";
import { isAdmin, signIn, signOut } from "@/lib/admin-auth";
import {
  approveSubmission,
  createAdminListing,
  createSubmission,
  rejectSubmission,
} from "@/lib/submissions";
import { buildListingFromForm } from "./form-mapper";

export type ActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldIssues?: Record<string, string> }
  | { status: "ok"; message: string }
  | {
      status: "blocked";
      message: string;
      failures: { code: string; field: string; message: string; authority: string }[];
    };

/* ---------- auth ---------- */

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const pass = String(formData.get("passphrase") ?? "");
  const ok = await signIn(pass);
  if (!ok) return { status: "error", message: "That passphrase is not correct." };
  revalidatePath("/admin");
  return { status: "ok", message: "Signed in." };
}

export async function signOutAction(): Promise<void> {
  await signOut();
  revalidatePath("/admin");
}

/* ---------- review ---------- */

export async function approveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await isAdmin())) return { status: "error", message: "Not signed in." };

  const id = String(formData.get("id") ?? "");

  // Override path: only when explicitly requested AND a reason is given, so a
  // bypass can never happen by a stray click or a replayed request.
  const wantsOverride = formData.get("override") === "yes";
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();

  if (wantsOverride && overrideReason.length < 4) {
    return {
      status: "error",
      message: "An override needs a reason — it is recorded on the listing.",
    };
  }

  const result = await approveSubmission(
    id,
    wantsOverride ? { by: "admin", reason: overrideReason } : undefined,
  );

  // The gate is re-checked server-side on approval, so a crafted request
  // cannot publish a listing the UI would have refused.
  if (!result.ok) {
    return {
      status: "blocked",
      message: "This listing cannot be published yet.",
      failures: result.gates.failures
        .filter((f) => f.severity === "blocking")
        .map(({ code, field, message, authority }) => ({ code, field, message, authority })),
    };
  }

  updateTag("listings");
  revalidatePath("/admin");
  revalidatePath(`/admin/${id}`);
  return {
    status: "ok",
    message: wantsOverride
      ? "Published with a compliance override. The bypass is recorded on the listing."
      : "Published.",
  };
}

export async function rejectAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await isAdmin())) return { status: "error", message: "Not signed in." };

  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (note.length < 4)
    return { status: "error", message: "Give the submitter a reason — it goes back to them." };

  await rejectSubmission(id, note);
  updateTag("listings");
  revalidatePath("/admin");
  revalidatePath(`/admin/${id}`);
  return { status: "ok", message: "Returned to the submitter." };
}

/* ---------- public submission (F06) ---------- */

export async function submitPropertyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const get = (k: string) => {
    const v = formData.get(k);
    return v === null || v === "" ? undefined : String(v);
  };
  const num = (k: string) => {
    const v = get(k);
    return v === undefined ? undefined : Number(v);
  };

  const market = get("market") as "uk" | "ae" | "pk" | undefined;
  if (!market) return { status: "error", message: "Choose a market." };

  const areaUnit = (get("areaUnit") ?? "sqft") as "sqft" | "sqm" | "marla" | "kanal";
  const areaValue = num("areaValue") ?? 0;
  const title = get("title") ?? "";

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
      tenureDetail: get("tenure") as "freehold" | "leasehold" | "commonhold" | undefined,
      epcRating: get("uk_epcRating"),
      constructionMaterials: get("uk_constructionMaterials"),
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

  const candidate = {
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70),
    title,
    description: get("description") ?? "",
    source: "self_submitted" as const,
    status: "pending_review" as const,
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
      qualifier: "asking" as const,
    },
    area: { value: areaValue, unit: areaUnit, canonicalSqft: toSqft(areaValue, areaUnit) },
    bedrooms: num("bedrooms"),
    bathrooms: num("bathrooms"),
    tenure: get("tenure") as "freehold" | "leasehold" | "commonhold" | undefined,
    location: {
      addressLines: [get("addressLine") ?? get("locality") ?? ""],
      locality: get("locality") ?? "",
      city: get("city") ?? "",
      freeholdZone: get("freeholdZone") === "on",
    },
    amenities: [],
    media: [],
    compliance,
    priceHistory: [],
  };

  const parsed = ListingInput.safeParse(candidate);
  if (!parsed.success) {
    const fieldIssues: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldIssues[issue.path.join(".")] = issue.message;
    }
    return {
      status: "error",
      message: "Some details need fixing before this can be submitted.",
      fieldIssues,
    };
  }

  await createSubmission({
    submitterName: get("submitterName") ?? "Unknown",
    submitterEmail: get("submitterEmail") ?? "",
    listing: parsed.data,
  });

  // Tell the submitter now what will hold the listing in review, rather than
  // letting them discover it days later through an admin rejection.
  const gates = evaluatePublishGates(parsed.data);
  const blocking = gates.failures.filter((f) => f.severity === "blocking");

  if (blocking.length) {
    return {
      status: "blocked",
      message:
        "Submitted. It will stay in review until the following are provided — our team will be in touch.",
      failures: blocking.map(({ code, field, message, authority }) => ({
        code,
        field,
        message,
        authority,
      })),
    };
  }

  updateTag("listings");
  revalidatePath("/admin");
  return {
    status: "ok",
    message: "Submitted for review. Nothing is published until our team approves it.",
  };
}

/* ---------- admin-entered listing ---------- */

export async function createListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await isAdmin())) return { status: "error", message: "Not signed in." };

  const built = buildListingFromForm(formData);
  if (!built.ok) {
    return {
      status: "error",
      message: "Some details need fixing.",
      fieldIssues: built.fieldIssues,
    };
  }

  const publishNow = formData.get("publishNow") === "on";
  const wantsOverride = formData.get("override") === "yes";
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();

  if (wantsOverride && overrideReason.length < 4) {
    return { status: "error", message: "An override needs a reason." };
  }

  const { published, gates } = await createAdminListing({
    listing: built.listing,
    by: "admin",
    publishNow,
    override: wantsOverride ? { reason: overrideReason } : undefined,
  });

  updateTag("listings");
  revalidatePath("/admin");

  if (!published && publishNow) {
    return {
      status: "blocked",
      message: "Saved to the queue, but not published — these must be resolved first.",
      failures: gates.failures
        .filter((f) => f.severity === "blocking")
        .map(({ code, field, message, authority }) => ({ code, field, message, authority })),
    };
  }

  return {
    status: "ok",
    message: published
      ? wantsOverride && !gates.canPublish
        ? "Published with a compliance override. The bypass is recorded on the listing."
        : "Published. It is live on the public site now."
      : "Saved to the review queue.",
  };
}
