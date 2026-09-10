import { Suspense } from "react";
import Link from "next/link";
import type { Market } from "@lavion/schema";
import { GateChip } from "@/components/gate-report";
import { formatPrice } from "@/lib/format";
import { agencyLeads, agencyListings, agencyOverview } from "@/lib/agency-data";
import { requireAgency } from "@/lib/session";
import { isConfigured } from "@/lib/session";
import { SignInForm } from "../admin/sign-in-form";
import { signOutAction } from "../admin/actions";
import { BRAND_NAME } from "@/lib/brand";

export const metadata = {
  title: "Agency dashboard",
  robots: { index: false, follow: false },
};

export default function AgencyPage() {
  return (
    <Suspense fallback={<div className="p-12 label">Loading…</div>}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  const session = await requireAgency();
  if (!session) return <SignInForm configured={isConfigured()} />;

  const [overview, listings, leads] = await Promise.all([
    agencyOverview(session.agencyId),
    agencyListings(session.agencyId),
    agencyLeads(session.agencyId),
  ]);

  if (!overview) {
    return (
      <main className="mx-auto max-w-md flex-1 px-6 py-24">
        <div className="border border-signal/40 bg-signal-wash p-7">
          <p className="label" style={{ color: "var(--color-signal)" }}>
            No agency attached
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            This account has an agency role but no agency. Ask us to reattach it
            — until then there is nothing to scope your view to.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="label">{overview.tierLabel} account</p>
          <h1 className="mt-3 font-display text-4xl">{overview.agencyName}</h1>
          <p className="label mt-2">
            Signed in as {session.name} · {session.role.replace("_", " ")}
          </p>
        </div>
        <form action={signOutAction}>
          <button className="label border border-line px-4 py-2 hover:border-brass">
            Sign out
          </button>
        </form>
      </div>

      <dl className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          k="Live listings"
          v={
            overview.allowance === null
              ? String(overview.live)
              : `${overview.live} / ${overview.allowance}`
          }
          accent
        />
        <Stat k="Awaiting review" v={String(overview.pending)} />
        <Stat k="New enquiries" v={String(overview.leadsNew)} accent={overview.leadsNew > 0} />
        <Stat k="Commission rate" v={`${(overview.commissionRate * 100).toFixed(1)}%`} />
      </dl>

      {!overview.canPublishMore && (
        <div className="mt-6 border border-ochre/50 bg-ochre-wash p-5">
          <p className="label" style={{ color: "var(--color-ochre)" }}>
            Listing allowance reached
          </p>
          <p className="mt-2 max-w-[64ch] text-sm leading-relaxed">
            Your {overview.tierLabel} plan covers {overview.allowance} live
            listings. Withdraw one, or move up a tier, to publish another.
          </p>
        </div>
      )}

      {/* ---- listings ---- */}
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="label">Your listings</h2>
          <Link href="/agency/new" className="label border border-brass/50 bg-brass-wash px-4 py-2 !text-brass hover:border-brass">
            + Add a property
          </Link>
        </div>

        {listings.length === 0 ? (
          <p className="mt-4 border border-line bg-surface p-10 text-center text-sm text-ink-soft">
            Nothing listed yet. Anything you submit is reviewed against your
            market&rsquo;s disclosure rules before it goes live.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-px bg-line">
            {listings.map((s) => {
              const m = s.listing.market as Market;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 bg-paper p-5">
                  <span className="label w-14 shrink-0">{m.toUpperCase()}</span>
                  <span className="min-w-[240px] flex-1">
                    <span className="block text-sm font-medium">{s.listing.title}</span>
                    <span className="label mt-1 block !normal-case !tracking-normal">
                      {s.listing.location.locality} ·{" "}
                      {formatPrice(s.listing.price.amount, s.listing.price.currency, m, {
                        compact: true,
                      })}
                    </span>
                  </span>
                  <span className="label">{s.listing.status.replace("_", " ")}</span>
                  <GateChip gates={s.gates} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---- leads ---- */}
      <section className="mt-12">
        <h2 className="label">Enquiries on your listings</h2>
        {leads.length === 0 ? (
          <p className="mt-4 border border-line bg-surface p-10 text-center text-sm text-ink-soft">
            No enquiries yet.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-px bg-line">
            {leads.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-paper p-5">
                <span className="min-w-[200px] flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium">{l.name}</span>
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
                    {l.listingTitle}
                  </span>
                </span>
                <span className="label">{l.kind}</span>
                <span className="label tnum">{l.createdAt.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-12 border-t border-line pt-6 text-xs leading-relaxed text-ink-faint">
        You see only your own agency&rsquo;s listings and the enquiries they
        generated. Valuation requests and enquiries not tied to one of your
        properties stay with the {BRAND_NAME} team.
      </p>
    </main>
  );
}

function Stat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="bg-paper p-5">
      <dt className="label">{k}</dt>
      <dd
        className="mt-2 font-display text-3xl tnum"
        style={{ color: accent ? "var(--color-brass)" : "var(--color-ink)" }}
      >
        {v}
      </dd>
    </div>
  );
}
