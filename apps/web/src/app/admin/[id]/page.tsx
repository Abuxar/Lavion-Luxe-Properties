import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Market } from "@lavion/schema";
import { GateReport } from "@/components/gate-report";
import { isAdmin, isConfigured } from "@/lib/admin-auth";
import { formatArea, formatPrice } from "@/lib/format";
import { getSubmission } from "@/lib/submissions";
import { SignInForm } from "../sign-in-form";
import { ApproveButton, DocumentDecision, RejectForm } from "./review-actions";
import { TRANSACTION_LABEL } from "@lavion/schema";

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
  const documents = sub.documents ?? [];
  const pendingDocuments = documents.filter((d) => d.status === "pending").length;
  // The advert's own photographs, in the order the public gallery will show
  // them — sorted here because the store keeps submission order, not display
  // order.
  const photos = [...(l.media ?? [])].sort((a, b) => a.order - b.order);
  const decided = sub.status !== "pending_review";
  const ov = sub.listing.complianceOverride;

  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-12">
      <Link href="/admin" className="label hover:text-brass">
        &larr; Review queue
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="label">
            {m.toUpperCase()} · {TRANSACTION_LABEL[l.transaction]}
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

          {/* The advert's photographs. Public by design — these are the same
              files the listing page serves — so they are shown directly from
              storage rather than through the staff-gated document route.
              Deliberately plain <img>: thumbnails on an internal page are not
              worth spending the account's image-optimisation quota on. */}
          <h2 className="label mt-10" id="photos">
            Property photos
          </h2>
          {photos.length === 0 ? (
            <p className="mt-3 max-w-[60ch] text-sm text-ink-soft">
              None attached. A listing with no photographs will publish, but it
              will sit near the bottom of every search — worth asking the
              submitter for images before approving.
            </p>
          ) : (
            <>
              <p className="mt-3 max-w-[62ch] text-sm text-ink-soft">
                {photos.length} {photos.length === 1 ? "image" : "images"}, in the
                order the listing gallery will show them. The first is the cover.
              </p>
              <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {photos.map((p, i) => (
                  <li key={`${p.cloudinaryId}-${i}`} className="border border-line bg-surface">
                    <a
                      href={p.cloudinaryId}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                      title="Open full size"
                    >
                      {p.type === "video" || p.type === "tour" ? (
                        <div className="flex aspect-[4/3] items-center justify-center bg-surface-2 p-4 text-center">
                          <span className="label">
                            {p.type === "video" ? "Video" : "Virtual tour"}
                            <br />
                            Open &rarr;
                          </span>
                        </div>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.cloudinaryId}
                          alt={p.alt ?? `${l.title} — photo ${i + 1}`}
                          loading="lazy"
                          className="aspect-[4/3] w-full bg-surface-2 object-cover"
                        />
                      )}
                    </a>
                    <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
                      <span className="label tnum">
                        {i === 0 ? "Cover" : `#${i + 1}`}
                        {p.type !== "image" && ` · ${p.type}`}
                      </span>
                      {p.alt && (
                        <span className="min-w-0 truncate text-xs text-ink-faint" title={p.alt}>
                          {p.alt}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h2 className="label mt-10">Declared compliance</h2>
          <ComplianceDump compliance={l.compliance} market={m} />

          {/* Seller documents. Staff only: the files are encrypted in storage
              and streamed by an admin-gated route, never linked publicly. */}
          <h2 className="label mt-10" id="documents">
            Ownership documents
          </h2>
          {documents.length === 0 ? (
            <p className="mt-3 max-w-[60ch] text-sm text-ink-soft">
              None attached. Ask the submitter for the title deed or transfer
              letter before publishing if the market needs it.
            </p>
          ) : (
            <>
              <p className="mt-3 max-w-[62ch] text-sm text-ink-soft">
                Visible to staff only. Each one needs a decision before this
                listing can be published — a rejection is sent to the submitter.
              </p>
              <ul className="mt-5 flex flex-col gap-5">
                {documents.map((d) => (
                  <li key={d.id} className="border border-line bg-surface">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line p-4">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.name}</span>
                      <span className="label tnum">{readableSize(d.size)}</span>
                      <DocumentBadge status={d.status} />
                    </div>

                    <div className="bg-surface-2">
                      {d.type === "application/pdf" ? (
                        <iframe
                          src={`/api/admin/documents/${sub.id}/${d.id}`}
                          title={d.name}
                          className="h-[520px] w-full border-0"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/admin/documents/${sub.id}/${d.id}`}
                          alt={d.name}
                          className="max-h-[520px] w-full bg-paper object-contain"
                        />
                      )}
                    </div>

                    <div className="p-4">
                      <a
                        href={`/api/admin/documents/${sub.id}/${d.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="label hover:text-brass"
                      >
                        Open full size &rarr;
                      </a>
                      {d.checkedBy && d.checkedAt && (
                        <p className="mt-2 text-xs text-ink-faint">
                          {d.status === "verified" ? "Verified" : "Rejected"} by {d.checkedBy} on{" "}
                          {d.checkedAt.slice(0, 10)}
                          {d.note ? ` — ${d.note}` : ""}
                        </p>
                      )}
                      {!decided && <DocumentDecision id={sub.id} docId={d.id} status={d.status} />}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
          <div>
            <h2 className="label mb-3">Publish gate</h2>
            <GateReport gates={sub.gates} />
          </div>

          {ov && (
            <div className="border border-signal/50 bg-signal-wash p-5">
              <p className="label" style={{ color: "var(--color-signal)" }}>
                Published via override
              </p>
              <p className="mt-3 text-sm">
                <strong>{ov.by}</strong> bypassed {ov.bypassed.length} blocking{" "}
                {ov.bypassed.length === 1 ? "rule" : "rules"} on{" "}
                {new Date(ov.at).toISOString().slice(0, 10)}.
              </p>
              <p className="mt-2 text-sm text-ink-soft">Reason: {ov.reason}</p>
              <ul className="mt-3 flex flex-col gap-1">
                {ov.bypassed.map((c) => (
                  <li key={c} className="label !normal-case !tracking-normal">
                    <code className="text-[11px]">{c}</code>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                This advert does not meet its market&rsquo;s disclosure rules.
                Resolve the items above and republish.
              </p>
            </div>
          )}

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
              <Link
                href={`/admin/${sub.id}/edit`}
                className="label border border-line px-4 py-3 text-center transition-colors hover:border-brass"
              >
                Edit details
              </Link>
              <ApproveButton id={sub.id} blocked={blocked} pendingDocuments={pendingDocuments} />
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

function readableSize(bytes: number): string {
  if (!bytes) return "—";
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function DocumentBadge({ status }: { status: "pending" | "verified" | "rejected" }) {
  const tone =
    status === "verified"
      ? "var(--color-brass)"
      : status === "rejected"
        ? "var(--color-signal)"
        : "var(--color-ink-faint)";
  return (
    <span
      className="label border px-2 py-1"
      style={{ color: tone, borderColor: `color-mix(in srgb, ${tone} 45%, transparent)` }}
    >
      {status === "verified" ? "Verified" : status === "rejected" ? "Rejected" : "Not checked"}
    </span>
  );
}
