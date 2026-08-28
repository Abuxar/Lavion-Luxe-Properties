import { Suspense } from "react";
import Link from "next/link";
import { MARKETS, type Market } from "@lavion/schema";
import { isAdmin, isConfigured } from "@/lib/admin-auth";
import { formatPrice } from "@/lib/format";
import { leadCounts, listLeads, type Lead } from "@/lib/leads";
import { SignInForm } from "../sign-in-form";
import { markLeadAction } from "./lead-actions";

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="p-12 label">Loading…</div>}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  if (!(await isAdmin())) return <SignInForm configured={await isConfigured()} />;

  const [leads, counts] = await Promise.all([listLeads(), leadCounts()]);
  const open = leads.filter((l) => l.status !== "closed");
  const closed = leads.filter((l) => l.status === "closed");

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="label">Admin</p>
          <h1 className="mt-3 font-display text-4xl">Leads</h1>
        </div>
        <Link href="/admin" className="label border border-line px-4 py-2 hover:border-brass">
          Review queue
        </Link>
      </div>

      <dl className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
        <Count k="New" v={counts.new} accent />
        <Count k="Contacted" v={counts.contacted} />
        <Count k="Viewings" v={counts.viewings} />
        <Count k="Valuations" v={counts.valuations} />
        <Count k="Total" v={counts.total} />
      </dl>

      <section className="mt-12">
        <h2 className="label">Open</h2>
        {open.length === 0 ? (
          <p className="mt-4 border border-line bg-surface p-10 text-center text-sm text-ink-soft">
            No leads yet. Enquiries, viewing requests and valuations all land here,
            already routed to the agent who covers the territory.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-px bg-line">
            {open.map((l) => (
              <LeadRow key={l.id} lead={l} />
            ))}
          </ul>
        )}
      </section>

      {closed.length > 0 && (
        <section className="mt-12">
          <h2 className="label">Closed</h2>
          <ul className="mt-4 flex flex-col gap-px bg-line">
            {closed.map((l) => (
              <LeadRow key={l.id} lead={l} />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function LeadRow({ lead: l }: { lead: Lead }) {
  const m = l.market as Market;
  const est = l.valuation?.estimate;

  return (
    <li className="bg-paper p-5">
      <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
        <span className="label w-16 shrink-0">{l.market.toUpperCase()}</span>

        <span className="min-w-[240px] flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{l.name}</span>
            <Kind kind={l.kind} />
            {l.status === "new" && (
              <span className="label border border-brass/40 bg-brass-wash px-2 py-0.5 !text-brass">
                New
              </span>
            )}
          </span>
          <span className="label mt-1 block !normal-case !tracking-normal">
            {l.email}
            {l.phone && ` · ${l.phone}`}
          </span>
          <span className="label mt-1 block !normal-case !tracking-normal text-ink-soft">
            {l.listingTitle ?? l.valuation?.addressLine ?? "—"}
            {l.locality && ` · ${l.locality}`}
            {l.preferredDate && ` · prefers ${l.preferredDate}`}
          </span>
          {est && (
            <span className="label mt-1 block tnum">
              Indicative {formatPrice(est.low, est.currency, m, { compact: true })}–
              {formatPrice(est.high, est.currency, m, { compact: true })} ·{" "}
              {est.comparableCount} comparables ({est.basis})
            </span>
          )}
          {l.message && (
            <span className="mt-2 block max-w-[60ch] text-sm text-ink-soft">{l.message}</span>
          )}
        </span>

        <span className="text-right">
          <span className="label block">Routed to</span>
          <span className="mt-1 block text-sm font-medium">{l.assignedAgentName}</span>
          <span className="label mt-1 block tnum">{l.createdAt.slice(0, 16).replace("T", " ")}</span>
        </span>

        <span className="flex gap-2">
          {l.status !== "contacted" && (
            <form action={markLeadAction}>
              <input type="hidden" name="id" value={l.id} />
              <input type="hidden" name="status" value="contacted" />
              <button className="label border border-line px-3 py-2 hover:border-brass">
                Contacted
              </button>
            </form>
          )}
          {l.status !== "closed" && (
            <form action={markLeadAction}>
              <input type="hidden" name="id" value={l.id} />
              <input type="hidden" name="status" value="closed" />
              <button className="label border border-line px-3 py-2 hover:border-brass">
                Close
              </button>
            </form>
          )}
        </span>
      </div>
    </li>
  );
}

function Kind({ kind }: { kind: Lead["kind"] }) {
  const label = kind === "valuation" ? "Valuation" : kind === "viewing" ? "Viewing" : "Enquiry";
  return <span className="label border border-line px-2 py-0.5">{label}</span>;
}

function Count({ k, v, accent }: { k: string; v: number; accent?: boolean }) {
  return (
    <div className="bg-paper p-5">
      <dt className="label">{k}</dt>
      <dd
        className="mt-2 font-display text-3xl tnum"
        style={{ color: accent && v > 0 ? "var(--color-brass)" : "var(--color-ink)" }}
      >
        {v}
      </dd>
    </div>
  );
}
