import { Suspense } from "react";
import Link from "next/link";
import { isAdmin, isConfigured } from "@/lib/admin-auth";
import { SignInForm } from "../sign-in-form";
import { NewListingForm } from "./new-listing-form";

export default function NewListingPage() {
  return (
    <Suspense fallback={<div className="p-12 label">Loading…</div>}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  if (!(await isAdmin())) return <SignInForm configured={await isConfigured()} />;

  return (
    <main className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-12">
      <Link href="/admin" className="label hover:text-brass">
        &larr; Review queue
      </Link>

      <div className="mt-6 border-b border-line pb-6">
        <p className="label">Admin</p>
        <h1 className="mt-3 font-display text-4xl">Add a property</h1>
        <div className="rule-brass mt-5 w-24" />
        <p className="mt-5 max-w-[62ch] leading-relaxed text-ink-soft">
          Publish directly to any of the three markets. The same disclosure
          rules apply as to agency submissions — the form asks only for what the
          selected market requires.
        </p>
      </div>

      <div className="mt-10">
        <NewListingForm />
      </div>
    </main>
  );
}
