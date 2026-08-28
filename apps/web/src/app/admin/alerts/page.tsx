import { Suspense } from "react";
import Link from "next/link";
import { isAdmin, isConfigured } from "@/lib/admin-auth";
import { demandByArea, savedSearchesWithMatches } from "@/lib/saved-searches";
import { SignInForm } from "../sign-in-form";
import { ackAction, toggleAction } from "./actions";

export default function AlertsPage() {
  return (
    <Suspense fallback={<div className="p-12 label">Loading…</div>}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  if (!(await isAdmin())) return <SignInForm configured={await isConfigured()} />;

  const [subs, demand] = await Promise.all([savedSearchesWithMatches(), demandByArea()]);
  const active = subs.filter((s) => s.active);
  const withNew = active.filter((s) => s.newSlugs.length > 0);

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="label">Admin</p>
          <h1 className="mt-3 font-display text-4xl">Saved searches</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/leads" className="label border border-line px-4 py-2 hover:border-brass">
            Leads
          </Link>
          <Link href="/admin" className="label border border-line px-4 py-2 hover:border-brass">
            Review queue
          </Link>
        </div>
      </div>

      {/* The scope is stated in the product, not only in the code. Nobody
          should assume emails are going out when they are not. */}
      <div className="mt-8 border border-ochre/50 bg-ochre-wash p-5">
        <p className="label" style={{ color: "var(--color-ochre)" }}>
          Email dispatch not connected
        </p>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed">
          Subscriptions and matching work; sending does not. Until an email
          provider and a scheduler are wired up, follow up on the matches below
          by hand, then mark them actioned so the next batch shows only what is
          genuinely new.
        </p>
      </div>

      <dl className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-3">
        <Count k="Active subscriptions" v={active.length} />
        <Count k="With new matches" v={withNew.length} accent />
        <Count k="Areas requested" v={demand.length} />
      </dl>

      {demand.length > 0 && (
        <section className="mt-12">
          <h2 className="label">Demand by area</h2>
          <p className="mt-2 max-w-[62ch] text-sm text-ink-soft">
            What buyers are asking for. An area with subscribers and no matching
            inventory is the clearest signal of what to onboard next.
          </p>
          <div className="mt-4 overflow-x-auto border border-line">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="bg-surface">
                  <Th>Market</Th>
                  <Th>Area</Th>
                  <Th>Subscribers</Th>
                  <Th>Matching listings</Th>
                </tr>
              </thead>
              <tbody>
                {demand.map((d) => (
                  <tr key={`${d.market}-${d.area}`} className="border-t border-line">
                    <Td>{d.market.toUpperCase()}</Td>
                    <Td>{d.area}</Td>
                    <Td className="tnum">{d.subscribers}</Td>
                    <Td className="tnum">
                      {d.matches === 0 ? (
                        <span style={{ color: "var(--color-signal)" }}>
                          0 &mdash; demand, no supply
                        </span>
                      ) : (
                        d.matches
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="label">Subscriptions</h2>
        {subs.length === 0 ? (
          <p className="mt-4 border border-line bg-surface p-10 text-center text-sm text-ink-soft">
            None yet. Buyers can follow a search from any filtered result set.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-px bg-line">
            {subs.map((s) => (
              <li key={s.id} className="bg-paper p-5">
                <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
                  <span className="label w-14 shrink-0">{s.market.toUpperCase()}</span>

                  <span className="min-w-[260px] flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{s.name ?? s.email}</span>
                      {s.newSlugs.length > 0 && (
                        <span className="label border border-brass/40 bg-brass-wash px-2 py-0.5 !text-brass">
                          {s.newSlugs.length} new
                        </span>
                      )}
                      {!s.active && (
                        <span className="label border border-line px-2 py-0.5">Paused</span>
                      )}
                    </span>
                    <span className="label mt-1 block !normal-case !tracking-normal">
                      {s.email}
                    </span>
                    <span className="mt-1.5 block text-sm text-ink-soft">{s.label}</span>
                  </span>

                  <span className="text-right">
                    <span className="label block">Matches</span>
                    <span className="mt-1 block font-display text-2xl tnum">{s.matchCount}</span>
                  </span>

                  <span className="flex gap-2">
                    {s.newSlugs.length > 0 && (
                      <form action={ackAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="label border border-line px-3 py-2 hover:border-brass">
                          Mark actioned
                        </button>
                      </form>
                    )}
                    <form action={toggleAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="active" value={String(!s.active)} />
                      <button className="label border border-line px-3 py-2 hover:border-brass">
                        {s.active ? "Pause" : "Resume"}
                      </button>
                    </form>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="label px-4 py-3 text-left">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
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
