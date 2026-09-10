"use client";

import { useActionState } from "react";
import { signInAction, type ActionState } from "./actions";
import { BRAND_NAME } from "@/lib/brand";

const initial: ActionState = { status: "idle" };

export function SignInForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(signInAction, initial);

  if (!configured) {
    return (
      <div className="mx-auto mt-24 max-w-md border border-signal/40 bg-signal-wash p-7">
        <p className="label" style={{ color: "var(--color-signal)" }}>
          Sign-in sealed
        </p>
        <p className="mt-3 text-sm leading-relaxed">
          <code>ADMIN_PASSPHRASE</code> is not set, so sessions cannot be signed
          and no account can be created. Set it (8+ characters) and redeploy.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Failing closed is deliberate: a missing variable must never leave a
          queue that can publish listings open to the internet.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mx-auto mt-24 max-w-md border border-line bg-surface p-8">
      <p className="label">{BRAND_NAME}</p>
      <h1 className="mt-3 font-display text-3xl">Sign in</h1>
      <div className="rule-brass mt-5 w-20" />

      <label htmlFor="email" className="label mt-8 block">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        required
        className="mt-2 w-full border border-line bg-paper px-4 py-3 text-sm outline-none focus-visible:border-brass"
      />

      <label htmlFor="password" className="label mt-5 block">
        Password
      </label>
      <input
        id="password"
        name="password"
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
        Staff and agency accounts sign in here. Passwords are hashed with
        scrypt; sessions last eight hours.
      </p>
    </form>
  );
}
