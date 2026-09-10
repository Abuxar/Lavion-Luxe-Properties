import { Suspense } from "react";
import Link from "next/link";
import { TIERS } from "@lavion/schema";
import { listAgencies, listUsers } from "@/lib/accounts";
import { isConfigured, requireStaff } from "@/lib/session";
import { SignInForm } from "../sign-in-form";
import { toggleAgencyAction, toggleUserAction } from "./actions";
import { AddAgencyForm, AddUserForm, SetPasswordForm } from "./team-forms";

export default function TeamPage() {
  return (
    <Suspense fallback={<div className="p-12 label">Loading…</div>}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  const session = await requireStaff();
  if (!session) return <SignInForm configured={isConfigured()} />;

  const [users, agencies] = await Promise.all([listUsers(), listAgencies()]);

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="label">Admin</p>
          <h1 className="mt-3 font-display text-4xl">Agencies &amp; users</h1>
          <p className="label mt-2">Signed in as {session.email}</p>
        </div>
        <Link href="/admin" className="label border border-line px-4 py-2 hover:border-brass">
          Review queue
        </Link>
      </div>

      <div className="mt-8 border border-line bg-surface p-5">
        <p className="label !text-brass">Roles</p>
        <ul className="mt-3 flex flex-col gap-1.5 text-sm text-ink-soft">
          <li>
            <strong>Super admin</strong> — staff. Sees every market, every
            listing and every lead.
          </li>
          <li>
            <strong>Agency admin</strong> and <strong>agent</strong> — scoped to
            one agency. They see only their own listings and the enquiries those
            listings generated.
          </li>
        </ul>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <AddAgencyForm />
        <AddUserForm agencies={agencies.filter((a) => a.active)} />

        <SetPasswordForm users={users} />
      </div>

      <section className="mt-12">
        <h2 className="label">Agencies</h2>
        {agencies.length === 0 ? (
          <p className="mt-4 border border-line bg-surface p-8 text-center text-sm text-ink-soft">
            None yet.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-px bg-line">
            {agencies.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-paper p-5">
                <span className="label w-14 shrink-0">{a.market.toUpperCase()}</span>
                <span className="min-w-[200px] flex-1">
                  <span className="block text-sm font-medium">{a.name}</span>
                  <span className="label mt-1 block">
                    {a.id} · {TIERS[a.tier].label} ·{" "}
                    {(TIERS[a.tier].commissionRate * 100).toFixed(1)}% commission
                  </span>
                </span>
                {!a.active && <span className="label border border-line px-2 py-0.5">Paused</span>}
                <form action={toggleAgencyAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="active" value={String(!a.active)} />
                  <button className="label border border-line px-3 py-2 hover:border-brass">
                    {a.active ? "Pause" : "Resume"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="label">Users</h2>
        <ul className="mt-4 flex flex-col gap-px bg-line">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-paper p-5">
              <span className="min-w-[220px] flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{u.name}</span>
                  <span className="label border border-line px-2 py-0.5">
                    {u.role.replace("_", " ")}
                  </span>
                  {!u.active && (
                    <span className="label border border-line px-2 py-0.5">Disabled</span>
                  )}
                </span>
                <span className="label mt-1 block !normal-case !tracking-normal">
                  {u.email}
                  {u.agencyId && ` · ${agencies.find((a) => a.id === u.agencyId)?.name ?? u.agencyId}`}
                </span>
              </span>
              <span className="label tnum">
                {u.lastLoginAt ? `last in ${u.lastLoginAt.slice(0, 10)}` : "never signed in"}
              </span>
              {/* The seeded super admin cannot disable itself — that is the
                  one action that locks everyone out of the system. */}
              {u.id !== session.userId && (
                <form action={toggleUserAction}>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="active" value={String(!u.active)} />
                  <button className="label border border-line px-3 py-2 hover:border-brass">
                    {u.active ? "Disable" : "Enable"}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
