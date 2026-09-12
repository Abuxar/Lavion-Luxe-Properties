"use client";

import { useActionState, useState } from "react";
import { approveAction, rejectAction, verifyDocumentAction, type ActionState } from "../actions";

const initial: ActionState = { status: "idle" };

export function ApproveButton({
  id,
  blocked,
  pendingDocuments = 0,
}: {
  id: string;
  blocked: boolean;
  /** Documents the admin has not decided on yet. Not overridable. */
  pendingDocuments?: number;
}) {
  const [state, action, pending] = useActionState(approveAction, initial);
  const [overriding, setOverriding] = useState(false);

  // Unchecked paperwork stops publication outright: an override records a
  // decision, and not having looked yet is not one.
  if (pendingDocuments > 0) {
    return (
      <div className="border border-line bg-surface p-5">
        <p className="label">Waiting on your check</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {pendingDocuments === 1
            ? "One document is still unchecked."
            : `${pendingDocuments} documents are still unchecked.`}{" "}
          Open each one under Ownership documents and verify or reject it, then
          publish from here.
        </p>
      </div>
    );
  }

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

/**
 * Verify or reject one document.
 *
 * Rejecting needs a reason, because it goes back to the seller as the thing
 * they have to fix. Verifying does not — the record already carries who
 * checked it and when.
 */
export function DocumentDecision({
  id,
  docId,
  status,
}: {
  id: string;
  docId: string;
  status: "pending" | "verified" | "rejected";
}) {
  const [state, action, pending] = useActionState(verifyDocumentAction, initial);
  const [rejecting, setRejecting] = useState(false);

  return (
    <form action={action} className="mt-3 flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="docId" value={docId} />

      {!rejecting && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            name="status"
            value="verified"
            disabled={pending}
            className="label border border-line px-4 py-2 transition-colors hover:border-brass disabled:opacity-50"
          >
            {status === "verified" ? "Verified ✓" : "Mark verified"}
          </button>
          <button
            type="button"
            onClick={() => setRejecting(true)}
            className="label border border-line px-4 py-2 transition-colors hover:border-signal"
          >
            {status === "rejected" ? "Rejected — change reason" : "Reject"}
          </button>
        </div>
      )}

      {rejecting && (
        <div className="border border-signal/40 bg-signal-wash p-4">
          <label htmlFor={`dn-${docId}`} className="label block">
            What is wrong with it — the seller is told
          </label>
          <input
            id={`dn-${docId}`}
            name="note"
            required
            minLength={4}
            placeholder="e.g. The transfer letter is unsigned."
            className="mt-2 w-full border border-line bg-paper px-3 py-2.5 text-sm outline-none focus-visible:border-signal"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              name="status"
              value="rejected"
              disabled={pending}
              className="px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--color-signal)" }}
            >
              {pending ? "Saving…" : "Reject document"}
            </button>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="label border border-line px-4 py-2.5 transition-colors hover:border-brass"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {state.status === "ok" && <Msg tone="ok">{state.message}</Msg>}
      {state.status === "error" && <Msg tone="bad">{state.message}</Msg>}
    </form>
  );
}
