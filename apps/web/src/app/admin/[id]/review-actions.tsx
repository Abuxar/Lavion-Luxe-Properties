"use client";

import { useActionState } from "react";
import { approveAction, rejectAction, type ActionState } from "../actions";

const initial: ActionState = { status: "idle" };

export function ApproveButton({ id, blocked }: { id: string; blocked: boolean }) {
  const [state, action, pending] = useActionState(approveAction, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending || blocked}
        title={blocked ? "Blocked by a compliance gate" : undefined}
        className="bg-ink px-6 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-brass disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? "Publishing…" : blocked ? "Cannot publish" : "Approve & publish"}
      </button>

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
      <label htmlFor="note" className="label">
        Reason — sent to the submitter
      </label>
      <textarea
        id="note"
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
