import { Suspense } from "react";
import Link from "next/link";
import { isAdmin, isConfigured } from "@/lib/admin-auth";
import { listFeedSources } from "@/lib/feeds";
import { SignInForm } from "../sign-in-form";
import { deleteSourceAction, toggleSourceAction } from "./actions";
import { AddSourceForm, RunFeedForm } from "./feed-forms";

export default function FeedsPage() {
  return (
    <Suspense fallback={<div className="p-12 label">Loading…</div>}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  if (!(await isAdmin())) return <SignInForm configured={await isConfigured()} />;

  const sources = await listFeedSources();

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="label">Admin</p>
          <h1 className="mt-3 font-display text-4xl">Feed sources</h1>
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

      <p className="mt-6 max-w-[70ch] leading-relaxed text-ink-soft">
        Inventory from agencies who do not manage a dashboard, pulled from a
        file they already produce. UK agencies generate portal feeds for
        Rightmove and Zoopla today, so asking for the same export is a normal
        commercial conversation — and it is the only lawful route. Scraping a
        competitor is a terms-of-service and copyright problem that also breaks
        the moment they change their markup.
      </p>

      <div className="mt-6 border border-line bg-surface p-5">
        <p className="label !text-brass">Imports are not a back door</p>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed">
          Every imported row runs the same publish gates as a hand-typed
          listing. A Dubai row arriving without a DLD permit is held in review
          exactly as it would be otherwise — bulk is precisely where a
          compliance bypass would do the most damage. Re-syncing an existing
          row updates it rather than duplicating, matched on the agency&rsquo;s
          own reference, and preserves any review decision or promotion.
        </p>
      </div>

      <div className="mt-8">
        <AddSourceForm />
      </div>

      <section className="mt-12">
        <h2 className="label">Sources</h2>

        {sources.length === 0 ? (
          <p className="mt-4 border border-line bg-surface p-10 text-center text-sm text-ink-soft">
            None yet. Add an agency above, then paste their export or point at a
            feed URL.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-px bg-line">
            {sources.map((s) => (
              <li key={s.id} className="bg-paper p-5">
                <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
                  <span className="label w-14 shrink-0">{s.market.toUpperCase()}</span>

                  <span className="min-w-[240px] flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{s.agencyName}</span>
                      <span className="label border border-line px-2 py-0.5">
                        {s.format.toUpperCase()}
                      </span>
                      {s.autoPublish && (
                        <span className="label border border-brass/40 bg-brass-wash px-2 py-0.5 !text-brass">
                          Auto-publish
                        </span>
                      )}
                      {!s.active && (
                        <span className="label border border-line px-2 py-0.5">Paused</span>
                      )}
                    </span>

                    <span className="label mt-1 block !normal-case !tracking-normal">
                      {s.url ?? "Paste-only source"}
                    </span>

                    {s.lastResult ? (
                      <span className="label mt-1 block tnum">
                        Last run {s.lastResult.at.toISOString().slice(0, 16).replace("T", " ")} ·{" "}
                        {s.lastResult.created} created, {s.lastResult.updated} updated,{" "}
                        {s.lastResult.rejected} rejected
                      </span>
                    ) : (
                      <span className="label mt-1 block">Never run</span>
                    )}

                    <RunFeedForm source={s} />
                  </span>

                  <span className="flex gap-2">
                    <form action={toggleSourceAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="active" value={String(!s.active)} />
                      <button className="label border border-line px-3 py-2 hover:border-brass">
                        {s.active ? "Pause" : "Resume"}
                      </button>
                    </form>
                    <form action={deleteSourceAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <button className="label border border-line px-3 py-2 hover:border-signal">
                        Remove
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
