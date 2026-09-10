import { Suspense } from "react";
import Link from "next/link";
import { MARKETS, TIERS, canPublishMore, type Market } from "@lavion/schema";
import { getAgency } from "@/lib/accounts";
import { agencyListings } from "@/lib/agency-data";
import { isConfigured, requireAgency } from "@/lib/session";
import { SignInForm } from "../../admin/sign-in-form";
import { AgencyListingForm } from "./agency-listing-form";

export const metadata = {
  title: "Add a property",
  robots: { index: false, follow: false },
};

export default function AgencyNewPage() {
  return (
    <Suspense fallback={<div className="p-12 label">Loading…</div>}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  const session = await requireAgency();
  if (!session) return <SignInForm configured={isConfigured()} />;

  const agency = session.agencyId ? await getAgency(session.agencyId) : undefined;
  if (!agency) {
    return (
      <main className="mx-auto max-w-md flex-1 px-6 py-24">
        <div className="border border-signal/40 bg-signal-wash p-7">
          <p className="label" style={{ color: "var(--color-signal)" }}>
            No agency attached
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            This account has an agency role but no agency, so there is nothing
            to file a listing under.
          </p>
        </div>
      </main>
    );
  }

  const mine = await agencyListings(agency.id);
  const live = mine.filter((s) => s.listing.status === "published").length;
  const room = canPublishMore(agency.tier, live);
  const def = TIERS[agency.tier];
  const m = agency.market as Market;

  return (
    <main className="mx-auto w-full max-w-[900px] flex-1 px-6 py-12">
      <Link href="/agency" className="label hover:text-brass">
        &larr; Dashboard
      </Link>

      <div className="mt-6 border-b border-line pb-6">
        <p className="label">
          {agency.name} · {MARKETS[m].label}
        </p>
        <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-tight">
          Add a property
        </h1>
        <div className="rule-brass mt-5 w-24" />
        <p className="label mt-5 tnum">
          {def.listingAllowance === null
            ? `${live} live · unlimited on ${def.label}`
            : `${live} of ${def.listingAllowance} live on ${def.label}`}
        </p>
      </div>

      {!room ? (
        <div className="mt-10 border border-ochre/50 bg-ochre-wash p-6">
          <p className="label" style={{ color: "var(--color-ochre)" }}>
            Listing allowance reached
          </p>
          <p className="mt-2 max-w-[62ch] text-sm leading-relaxed">
            Your {def.label} plan covers {def.listingAllowance} live listings.
            Withdraw one, or move up a tier, before adding another.
          </p>
          <Link href="/agency" className="label mt-5 inline-block hover:text-brass">
            Back to your listings &rarr;
          </Link>
        </div>
      ) : (
        <div className="mt-10">
          <AgencyListingForm market={m} />
        </div>
      )}
    </main>
  );
}
