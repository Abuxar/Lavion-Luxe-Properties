"use client";

import { useActionState, useState } from "react";
import type { Agency, User } from "@/lib/accounts";
import {
  createAgencyAction,
  createUserAction,
  setPasswordAction,
  type TeamState,
} from "./actions";

const initial: TeamState = { status: "idle" };

const cls =
  "mt-2 w-full border border-line bg-paper px-3 py-2.5 text-sm outline-none focus-visible:border-brass";

export function AddAgencyForm() {
  const [state, action, pending] = useActionState(createAgencyAction, initial);

  return (
    <form action={action} className="border border-line bg-surface p-6">
      <p className="label">New agency</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <Field name="name" label="Agency name" required />
        <Select
          name="market"
          label="Market"
          options={[
            { value: "uk", label: "United Kingdom" },
            { value: "ae", label: "United Arab Emirates" },
            { value: "pk", label: "Pakistan" },
          ]}
        />
        <Select
          name="tier"
          label="Tier"
          options={[
            { value: "starter", label: "Starter" },
            { value: "professional", label: "Professional" },
            { value: "enterprise", label: "Enterprise" },
          ]}
        />
      </div>
      <Result state={state} />
      <button
        type="submit"
        disabled={pending}
        className="mt-5 bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-brass disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create agency"}
      </button>
    </form>
  );
}

export function AddUserForm({ agencies }: { agencies: Agency[] }) {
  const [state, action, pending] = useActionState(createUserAction, initial);
  const [role, setRole] = useState<string>("agent");
  const needsAgency = role !== "super_admin";

  return (
    <form action={action} className="border border-line bg-surface p-6">
      <p className="label">New user</p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field name="name" label="Name" required />
        <Field name="email" label="Email" type="email" required />

        <div>
          <label htmlFor="role" className="label block">
            Role
          </label>
          <select
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={cls}
          >
            <option value="agent">Agent</option>
            <option value="agency_admin">Agency admin</option>
            <option value="super_admin">Super admin (staff)</option>
          </select>
        </div>

        {needsAgency && (
          <div>
            <label htmlFor="agencyId" className="label block">
              Agency
            </label>
            <select id="agencyId" name="agencyId" className={cls} required>
              <option value="">Choose an agency…</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.market.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sm:col-span-2">
          <label htmlFor="password" className="label block">
            Initial password
          </label>
          <input
            id="password"
            name="password"
            type="text"
            required
            minLength={10}
            autoComplete="new-password"
            className={cls}
          />
          <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
            At least 10 characters. Stored as a scrypt hash and never shown
            again — pass it to the person out of band, not by email.
          </p>
        </div>
      </div>

      <Result state={state} />

      <button
        type="submit"
        disabled={pending || (needsAgency && agencies.length === 0)}
        className="mt-5 bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-brass disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create user"}
      </button>

      {needsAgency && agencies.length === 0 && (
        <p className="mt-3 text-xs" style={{ color: "var(--color-ochre)" }}>
          Create an agency first — an agency role has to belong to one.
        </p>
      )}
    </form>
  );
}

function Result({ state }: { state: TeamState }) {
  if (state.status === "error")
    return (
      <p className="mt-4 text-sm" style={{ color: "var(--color-signal)" }}>
        {state.message}
      </p>
    );
  if (state.status === "ok")
    return (
      <p className="mt-4 text-sm" style={{ color: "var(--color-brass)" }}>
        {state.message}
      </p>
    );
  return null;
}

function Field({
  name,
  label,
  type = "text",
  required,
  minLength,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label block">
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className={cls}
      />
    </div>
  );
}

function Select({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={name} className="label block">
        {label}
      </label>
      <select id={name} name={name} className={cls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Rotate a password.
 *
 * Staff can reset any account including their own, because with a single super
 * admin there is nobody else to do it. The seed admin's hash was readable from
 * a public Blob URL until the queue documents were encrypted, so that account
 * in particular should be rotated once rather than left as-is.
 */
export function SetPasswordForm({ users }: { users: User[] }) {
  const [state, action, pending] = useActionState(setPasswordAction, initial);

  return (
    <form action={action} className="border border-line bg-surface p-6">
      <p className="label">Change a password</p>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="userId" className="label block">
            Account
          </label>
          <select id="userId" name="userId" className={cls} required>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} — {u.email}
              </option>
            ))}
          </select>
        </div>

        {/* Not "password": the New user form on this page already owns that
            id, and a duplicate sent this label to the wrong input. */}
        <Field
          name="newPassword"
          label="New password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Field
          name="newPasswordConfirm"
          label="Confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-faint">
        At least 8 characters. Live sessions are not signed out — the cookie
        carries a user id, not the password. To end them, rotate SESSION_SECRET.
      </p>

      <Result state={state} />

      <button
        type="submit"
        disabled={pending || users.length === 0}
        className="mt-5 bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-brass disabled:opacity-50"
      >
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
