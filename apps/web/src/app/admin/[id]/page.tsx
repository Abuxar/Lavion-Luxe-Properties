import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Market } from "@lavion/schema";
import { GateReport } from "@/components/gate-report";
import { isAdmin, isConfigured } from "@/lib/admin-auth";
import { formatArea, formatPrice } from "@/lib/format";
import { getSubmission } from "@/lib/submissions";
import { SignInForm } from "../sign-in-form";
import { ApproveButton, RejectForm } from "./review-actions";

export default function ReviewPage({ params }: PageProps<"/admin/[id]">) {
  return (
    <Suspense fallback={<div className="p-12 label">Loading…</div>}>
      <Gate params={params} />
    </Suspense>
  );
}

async function Gate({ params }: { params: PageProps<"/admin/[id]">["params"] }) {
  if (!(await isAdmin())) return <SignInForm configured={await isConfigured()} />;

  const { id } = await params;
  const sub = await getSubmission(id);
  if (!sub) notFound();

  const l = sub.listing;
  const m = l.market as Market;
  const blocked = !sub.gates.canPublish;
  const decided = sub.status !== "pending_review";

  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-12">
      <Link href="/admin" className="label hover:text-brass">
        &larr; Review queue
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="label">
            {m.toUpperCase()} · {l.transaction === "sale" ? "For sale" : "To rent"}
            {l.offPlan && " · Off-plan"}
          </p>
          <h1 className="mt-3 max-w-[30ch] font-display text-3xl leading-tight">{l.title}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {l.location.locality}, {l.location.city}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl tnum">
            {formatPrice(l.price.amount, l.price.currency, m)}
          </p>
          <p className="label mt-1">{formatArea(l.area.canonicalSqft, m)}</p>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <h2 className="label">Submission</h2>
          <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <Row k="Submitted by" v={sub.submitterName} />
            <Row k="Email" v={sub.submitterEmail} />
            <Row k="Received" v={sub.submittedAt.slice(0, 16).replace("T", " ")} />
            <Row k="Source" v={l.source.replace(/_/g, " ")} />
            <Row k="Bedrooms" v={String(l.bedrooms ?? "—")} />
            <Row k="Bathrooms" v={String(l.bathrooms ?? "—")} />
            <Row k="Tenure" v={l.tenure ?? "—"} />
            <Row k="Category" v={l.category} />
          </dl>

          <h2 className="label mt-10">Description</h2>
          <p className="mt-3 max-w-[65ch] leading-relaxed text-ink-soft">{l.description}</p>

          <h2 className="label mt-10">Declared compliance</h2>
          <ComplianceDump compliance={l.compliance} market={m} />
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
          <div>
            <h2 className="label mb-3">Publish gate</h2>
            <GateReport gates={sub.gates} />
          </div>

          {decided ? (
            <div className="border border-line bg-surface p-5">
              <p className="label">
                {sub.status === "approved" ? "Published" : "Returned to submitter"}
              </p>
              {sub.reviewNote && (
                <p className="mt-2 text-sm text-ink-soft">{sub.reviewNote}</p>
              )}
            </div>
          ) : (
            <>
              <ApproveButton id={sub.id} blocked={blocked} />
              <div className="border-t border-line pt-6">
                <RejectForm id={sub.id} />
              </div>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-2">
      <dt className="text-sm text-ink-faint">{k}</dt>
      <dd className="text-sm font-medium capitalize">{v}</dd>
    </div>
  );
}

function ComplianceDump({
  compliance,
  market,
}: {
  compliance: Record<string, Record<string, unknown> | undefined>;
  market: Market;
}) {
  const block = compliance?.[market];
  const entries = Object.entries(block ?? {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length),
  );

  if (!entries.length) {
    return (
      <p className="mt-3 border border-line bg-surface p-4 text-sm text-ink-faint">
        Nothing declared for this market.
      </p>
    );
  }

  return (
    <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {entries.map(([k, v]) => (
        <Row
          key={k}
          k={k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}
          v={v instanceof Date ? v.toISOString().slice(0, 10) : String(v)}
        />
      ))}
    </dl>
  );
}
