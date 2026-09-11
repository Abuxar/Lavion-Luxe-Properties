import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin, isConfigured } from "@/lib/admin-auth";
import { getSubmission } from "@/lib/submissions";
import { SignInForm } from "../../sign-in-form";
import { NewListingForm, type ListingFormEdit } from "../../new/new-listing-form";

/**
 * Edit a submission that is still in review.
 *
 * Exists because the queue could only approve or reject. A listing submitted
 * under the wrong market — a Lahore house entered on the UK page, so filed as
 * UK and priced in pounds — could either go live wrong or be bounced back to
 * the seller to re-enter from scratch. Now it can be put right here.
 */
export default function EditSubmissionPage({ params }: PageProps<"/admin/[id]/edit">) {
  return (
    <Suspense fallback={<div className="p-12 label">Loading…</div>}>
      <Gate params={params} />
    </Suspense>
  );
}

const day = (x?: Date | string) => (x ? new Date(x).toISOString().slice(0, 10) : "");
const str = (x: unknown) => (x === undefined || x === null ? "" : String(x));

async function Gate({ params }: { params: PageProps<"/admin/[id]/edit">["params"] }) {
  if (!(await isAdmin())) return <SignInForm configured={await isConfigured()} />;

  const { id } = await params;
  const sub = await getSubmission(id);
  if (!sub) notFound();

  const l = sub.listing;
  const c = l.compliance ?? {};

  if (sub.status !== "pending_review") {
    return (
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-12">
        <Link href={`/admin/${id}`} className="label hover:text-brass">
          &larr; Back to the submission
        </Link>
        <p className="mt-8 max-w-[60ch] text-ink-soft">
          Only submissions still in review can be edited. This one has already
          been {sub.status === "approved" ? "published" : "returned to the submitter"}.
        </p>
      </main>
    );
  }

  const edit: ListingFormEdit = {
    submissionId: id,
    market: l.market,
    tenure: l.tenure ?? "freehold",
    offPlan: Boolean(l.offPlan),
    mediaUrls: l.media.map((m) => m.cloudinaryId).join("\n"),
    values: {
      title: l.title,
      transaction: l.transaction,
      category: l.category,
      amount: str(l.price.amount),
      qualifier: l.price.qualifier ?? "asking",
      areaValue: str(l.area.value),
      areaUnit: l.area.unit,
      bedrooms: str(l.bedrooms),
      bathrooms: str(l.bathrooms),
      description: l.description,
      amenities: l.amenities.join("\n"),
      addressLine: l.location.addressLines.join("\n"),
      locality: l.location.locality.trim(),
      city: l.location.city.trim(),
      region: str(l.location.region),
      postcode: str(l.location.postcode),
      lat: str(l.location.geo?.lat),
      lng: str(l.location.geo?.lng),
      freeholdZone: l.location.freeholdZone ? "on" : "",
      ae_permitNumber: str(c.ae?.permitNumber),
      ae_permitExpiry: day(c.ae?.permitExpiry),
      ae_developerName: str(c.ae?.developerName),
      ae_escrowAccount: str(c.ae?.escrowAccount),
      ae_completionDate: day(c.ae?.completionDate),
      uk_councilTaxBand: str(c.uk?.councilTaxBand),
      uk_epcRating: str(c.uk?.epcRating),
      uk_constructionMaterials: str(c.uk?.constructionMaterials),
      uk_parking: str(c.uk?.parking),
      uk_leaseholdYearsRemaining: str(c.uk?.leaseholdYearsRemaining),
      uk_serviceChargeAnnual: str(c.uk?.serviceChargeAnnual),
      uk_groundRentAnnual: str(c.uk?.groundRentAnnual),
      pk_societyName: str(c.pk?.societyName),
      pk_societyApprovalRef: str(c.pk?.societyApprovalRef),
      pk_transferAuthority: str(c.pk?.transferAuthority),
    },
  };

  return (
    <main className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-12">
      <Link href={`/admin/${id}`} className="label hover:text-brass">
        &larr; Back to the submission
      </Link>

      <div className="mt-6 border-b border-line pb-6">
        <p className="label">Admin · {id}</p>
        <h1 className="mt-3 font-display text-4xl">Edit submission</h1>
        <div className="rule-brass mt-5 w-24" />
        <p className="mt-5 max-w-[62ch] leading-relaxed text-ink-soft">
          From {sub.submitterName}. Correct anything that was entered wrongly —
          including the market, if it was submitted from the wrong country&rsquo;s
          page. The price is in the currency of the market you choose.
        </p>
      </div>

      <div className="mt-10">
        <NewListingForm edit={edit} />
      </div>
    </main>
  );
}
