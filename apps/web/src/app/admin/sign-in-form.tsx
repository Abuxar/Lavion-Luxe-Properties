"use client";

import { useActionState } from "react";
import { signInAction, type ActionState } from "./actions";

const initial: ActionState = { status: "idle" };

export function SignInForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(signInAction, initial);

  if (!configured) {
    return (
      <div className="mx-auto mt-24 max-w-md border border-signal/40 bg-signal-wash p-7">
        <p className="label" style={{ color: "var(--color-signal)" }}>
          Queue sealed
        </p>
        <p className="mt-3 text-sm leading-relaxed">
          <code>ADMIN_PASSPHRASE</code> is not set, so the review queue is closed.
          Set it (8+ characters) in the environment and redeploy.
        </p>
        <p className="mt-3 text-xs text-ink-faint">
          Failing closed is deliberate: a missing variable must never leave a
          queue that can publish listings open to the internet.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mx-auto mt-24 max-w-md border border-line bg-surface p-8">
      <p className="label">Lavion Luxe</p>
      <h1 className="mt-3 font-display text-3xl">Review queue</h1>
      <div className="rule-brass mt-5 w-20" />

      <label htmlFor="passphrase" className="label mt-8 block">
        Passphrase
      </label>
      <input
        id="passphrase"
        name="passphrase"
        type="password"
        autoComplete="current-password"
        required
        className="mt-2 w-full border border-line bg-paper px-4 py-3 text-sm outline-none focus-visible:border-brass"
      />

      {state.status === "error" && (
        <p className="mt-3 text-sm" style={{ color: "var(--color-signal)" }}>
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full bg-ink px-6 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-brass disabled:opacity-50"
      >
        {pending ? "Checking…" : "Sign in"}
      </button>

      <p className="mt-6 text-xs leading-relaxed text-ink-faint">
        Placeholder access control for phase 1 — a single shared passphrase, not
        a user system. Replace with the JWT and role model before any agency
        gets access.
      </p>
    </form>
  );
}
