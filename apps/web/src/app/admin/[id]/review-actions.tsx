"use client";

import { useActionState, useState } from "react";
import { approveAction, rejectAction, type ActionState } from "../actions";

const initial: ActionState = { status: "idle" };

export function ApproveButton({ id, blocked }: { id: string; blocked: boolean }) {
  const [state, action, pending] = useActionState(approveAction, initial);
  const [overriding, setOverriding] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />

      {!blocked && (
        <button
          type="submit"
          disabled={pending}
          className="bg-ink px-6 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-brass disabled:opacity-40"
        >
          {pending ? "Publishing…" : "Approve & publish"}
        </button>
      )}

      {blocked && !overriding && (
        <>
          <button
            type="button"
            disabled
            className="cursor-not-allowed bg-ink/40 px-6 py-3.5 text-sm font-medium text-paper opacity-40"
          >
            Cannot publish
          </button>
          <button
            type="button"
            onClick={() => setOverriding(true)}
            className="border border-signal/50 px-6 py-3 text-xs font-medium transition-colors hover:bg-signal-wash"
            style={{ color: "var(--color-signal)" }}
          >
            Publish anyway (override)
          </button>
        </>
      )}

      {blocked && overriding && (
        <div className="border border-signal/50 bg-signal-wash p-5">
          <p className="label" style={{ color: "var(--color-signal)" }}>
            Compliance override
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            This publishes an advert that fails a legal disclosure requirement.
            It does not make the advert lawful — in Dubai, advertising without a
            live DLD permit is a RERA violation regardless of what this tool
            allows.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">
            The reason and the bypassed rules are recorded on the listing so it
            can be found and fixed later.
          </p>

          <input type="hidden" name="override" value="yes" />
          <label htmlFor={`or-${id}`} className="label mt-5 block">
            Reason
          </label>
          <input
            id={`or-${id}`}
            name="overrideReason"
            required
            minLength={4}
            defaultValue="Testing"
            className="mt-2 w-full border border-line bg-paper px-4 py-3 text-sm outline-none focus-visible:border-brass"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="px-5 py-3 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--color-signal)" }}
            >
              {pending ? "Publishing…" : "Publish anyway"}
            </button>
            <button
              type="button"
              onClick={() => setOverriding(false)}
              className="border border-line px-5 py-3 text-sm transition-colors hover:border-brass"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {state.status === "ok" && <Msg tone="ok">{state.message}</Msg>}
      {state.status === "error" && <Msg tone="bad">{state.message}</Msg>}
      {state.status === "blocked" && (
        <div className="border border-signal/40 bg-signal-wash p-4">
          <p className="text-sm font-medium" style={{ color: "var(--color-signal)" }}>
            {state.message}
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {state.failures.map((f) => (
              <li key={f.code} className="text-xs text-ink-soft">
                {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}

export function RejectForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(rejectAction, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <label htmlFor={`note-${id}`} className="label">
        Reason — sent to the submitter
      </label>
      <textarea
        id={`note-${id}`}
        name="note"
        rows={3}
        required
        placeholder="e.g. Please supply the DLD permit number and expiry date."
        className="w-full border border-line bg-paper px-4 py-3 text-sm outline-none focus-visible:border-brass"
      />
      <button
        type="submit"
        disabled={pending}
        className="border border-line px-6 py-3 text-sm font-medium transition-colors hover:border-signal disabled:opacity-50"
      >
        {pending ? "Returning…" : "Return to submitter"}
      </button>

      {state.status === "ok" && <Msg tone="ok">{state.message}</Msg>}
      {state.status === "error" && <Msg tone="bad">{state.message}</Msg>}
    </form>
  );
}

function Msg({ tone, children }: { tone: "ok" | "bad"; children: React.ReactNode }) {
  return (
    <p
      className="text-sm"
      style={{ color: tone === "ok" ? "var(--color-brass)" : "var(--color-signal)" }}
    >
      {children}
    </p>
  );
}
