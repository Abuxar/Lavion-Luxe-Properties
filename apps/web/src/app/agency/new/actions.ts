"use server";

import { revalidatePath, updateTag } from "next/cache";
import { canPublishMore, evaluatePublishGates, TIERS } from "@lavion/schema";
import { getAgency } from "@/lib/accounts";
import { agencyListings } from "@/lib/agency-data";
import { buildListingFromForm } from "@/app/admin/form-mapper";
import { requireAgency } from "@/lib/session";
import { createSubmission } from "@/lib/submissions";

export type SubmitState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldIssues?: Record<string, string> }
  | { status: "ok"; message: string }
  | {
      status: "held";
      message: string;
      failures: { code: string; field: string; message: string; authority: string }[];
    };

export async function submitAgencyListingAction(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const session = await requireAgency();
  if (!session?.agencyId)
    return { status: "error", message: "Not signed in to an agency account." };

  const agency = await getAgency(session.agencyId);
  if (!agency || !agency.active)
    return { status: "error", message: "This agency account is not active." };

  // Allowance is enforced on the server, not just hinted at in the UI — the
  // dashboard warning is a courtesy, this is the control.
  const mine = await agencyListings(session.agencyId);
  const live = mine.filter((s) => s.listing.status === "published").length;
  if (!canPublishMore(agency.tier, live)) {
    return {
      status: "error",
      message: `Your ${TIERS[agency.tier].label} plan covers ${TIERS[agency.tier].listingAllowance} live listings. Withdraw one, or move up a tier, before adding another.`,
    };
  }

  const built = buildListingFromForm(formData, "self_submitted");
  if (!built.ok) {
    return {
      status: "error",
      message: "Some details need fixing.",
      fieldIssues: built.fieldIssues,
    };
  }

  // The agency comes from the session, never from the form — otherwise an
  // agency could file listings under a competitor's name.
  const listing = {
    ...built.listing,
    ownerAgencyId: session.agencyId,
    market: agency.market,
  };

  await createSubmission({
    submitterName: `${session.name} (${agency.name})`,
    submitterEmail: session.email,
    listing,
  });

  updateTag("listings");
  revalidatePath("/agency");
  revalidatePath("/admin");

  // Nothing self-publishes, whatever the role. Staff review preserves catalogue
  // integrity, which is the whole point of the gated-submission model.
  const gates = evaluatePublishGates(listing);
  const blocking = gates.failures.filter((f) => f.severity === "blocking");

  if (blocking.length) {
    return {
      status: "held",
      message:
        "Submitted. It will stay in review until these are provided — our team will be in touch.",
      failures: blocking.map(({ code, field, message, authority }) => ({
        code,
        field,
        message,
        authority,
      })),
    };
  }

  return {
    status: "ok",
    message: "Submitted for review. Our team will publish it shortly.",
  };
}
