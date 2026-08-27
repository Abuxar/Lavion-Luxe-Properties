import { Suspense } from "react";
import Link from "next/link";
import { MARKETS, type Market } from "@lavion/schema";
import { GateChip } from "@/components/gate-report";
import { isAdmin, isConfigured } from "@/lib/admin-auth";
import { formatPrice } from "@/lib/format";
import { listSubmissions, queueCounts } from "@/lib/submissions";
import { SignInForm } from "./sign-in-form";
import { signOutAction } from "./actions";

export default function AdminPage() {
  // cookies() is a runtime API, so the gated content streams while the
  // surrounding shell prerenders.
  return (
    <Suspense fallback={<QueueSkeleton />}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  if (!(await isAdmin())) return <SignInForm configured={await isConfigured()} />;
  return <Queue />;
}

async function Queue() {
  const [subs, counts] = await Promise.all([listSubmissions(), queueCounts()]);
  const pending = subs.filter((s) => s.status === "pending_review");
  const decided = subs.filter((s) => s.status !== "pending_review");

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="label">Admin</p>
          <h1 className="mt-3 font-display text-4xl">Review queue</h1>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="label border border-line px-4 py-2 hover:border-brass">
            Sign out
          </button>
        </form>
      </div>

      <dl className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-4">
        <Count k="Awaiting review" v={counts.pending} />
        <Count k="Ready to publish" v={counts.readyToPublish} accent />
        <Count k="Blocked" v={counts.blocked} signal={counts.blocked > 0} />
        <Count k="Published" v={counts.approved} />
      </dl>

      <section className="mt-12">
        <h2 className="label">Awaiting review</h2>
        {pending.length === 0 ? (
          <p className="mt-4 border border-line bg-surface p-10 text-center text-sm text-ink-soft">
            Nothing waiting. New submissions land here automatically.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-px bg-line">
            {pending.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/${s.id}`}
                  className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-paper p-5 transition-colors hover:bg-surface"
                >
                  <span className="label w-16 shrink-0">{s.listing.market.toUpperCase()}</span>

                  <span className="min-w-[240px] flex-1">
                    <span className="block text-sm font-medium">{s.listing.title}</span>
                    <span className="label mt-1 block !normal-case !tracking-normal">
                      {s.listing.location.locality}, {s.listing.location.city} · {s.submitterName}
                    </span>
                  </span>

                  <span className="tnum text-sm">
                    {formatPrice(
                      s.listing.price.amount,
                      s.listing.price.currency,
                      s.listing.market as Market,
                      { compact: true },
                    )}
                  </span>

                  <GateChip gates={s.gates} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {decided.length > 0 && (
        <section className="mt-12">
          <h2 className="label">Decided</h2>
          <ul className="mt-4 flex flex-col gap-px bg-line">
            {decided.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-4 bg-paper p-5">
                <span className="label w-16 shrink-0">{s.listing.market.toUpperCase()}</span>
                <span className="min-w-[240px] flex-1 text-sm">{s.listing.title}</span>
                <span
                  className="label"
                  style={{
                    color:
                      s.status === "approved" ? "var(--color-brass)" : "var(--color-ink-faint)",
                  }}
                >
                  {s.status === "approved" ? "Published" : "Returned"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-12 border-t border-line pt-6 text-xs leading-relaxed text-ink-faint">
        Phase 1: submissions are held in memory and reset when the server
        instance recycles. {MARKETS.ae.label} listings additionally require a
        live DLD permit before they can be published.
      </p>
    </main>
  );
}

function Count({
  k,
  v,
  accent,
  signal,
}: {
  k: string;
  v: number;
  accent?: boolean;
  signal?: boolean;
}) {
  return (
    <div className="bg-paper p-5">
      <dt className="label">{k}</dt>
      <dd
        className="mt-2 font-display text-3xl tnum"
        style={{
          color: signal
            ? "var(--color-signal)"
            : accent
              ? "var(--color-brass)"
              : "var(--color-ink)",
        }}
      >
        {v}
      </dd>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-12" aria-hidden>
      <div className="h-10 w-52 animate-pulse bg-surface-2" />
      <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-paper p-5">
            <div className="h-3 w-24 animate-pulse bg-surface-2" />
            <div className="mt-3 h-8 w-10 animate-pulse bg-surface-2" />
          </div>
        ))}
      </div>
    </main>
  );
}
