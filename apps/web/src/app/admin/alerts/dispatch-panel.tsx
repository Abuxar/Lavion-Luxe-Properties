"use client";

import { useActionState } from "react";
import { dispatchAction, type DispatchState } from "./actions";

const initial: DispatchState = { status: "idle" };

/**
 * Runs dispatch by hand. There is still no scheduler, so this is the trigger —
 * and it reports exactly what the provider did rather than assuming it worked.
 */
export function DispatchPanel({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(dispatchAction, initial);

  return (
    <form action={action} className="mt-6 border border-line bg-surface p-5">
      <p className="label">Send alerts</p>
      <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-ink-soft">
        {configured
          ? "Sends one email per subscription that has new matches, then marks those matches seen so the next batch is genuinely new. A subscription is only marked after its email is accepted — a provider outage must not swallow the batch."
          : "No email provider is configured, so a run will report every subscription as skipped rather than pretending. Set RESEND_API_KEY to enable sending."}
      </p>

      <label className="mt-4 flex items-center gap-2.5">
        <input type="checkbox" name="dryRun" defaultChecked className="h-4 w-4 accent-[var(--color-brass)]" />
        <span className="text-sm">Preview only — show what would be sent</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-4 bg-ink px-5 py-3 text-sm font-medium text-paper transition-colors hover:bg-brass disabled:opacity-50"
      >
        {pending ? "Running…" : "Run dispatch"}
      </button>

      {state.status === "error" && (
        <p className="mt-4 text-sm" style={{ color: "var(--color-signal)" }}>
          {state.message}
        </p>
      )}

      {state.status === "done" && (
        <div className="mt-5 border-t border-line pt-5">
          <p className="label" style={{ color: state.dryRun ? "var(--color-ochre)" : "var(--color-brass)" }}>
            {state.dryRun ? "Preview — nothing sent" : `Provider: ${state.summary.providerName}`}
          </p>
          <p className="mt-2 text-sm tnum">
            {state.summary.sent} sent · {state.summary.skipped} skipped ·{" "}
            {state.summary.failed} failed · {state.summary.nothingNew} with nothing new
          </p>

          {state.summary.rows.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {state.summary.rows.map((r) => (
                <li key={r.id} className="text-xs">
                  <span
                    style={{
                      color:
                        r.outcome === "sent"
                          ? "var(--color-brass)"
                          : r.outcome === "failed"
                            ? "var(--color-signal)"
                            : "var(--color-ink-faint)",
                    }}
                  >
                    {r.outcome}
                  </span>{" "}
                  <span className="text-ink-soft">
                    {r.email} — {r.label}
                    {r.matches > 0 && ` (${r.matches})`}
                    {r.detail && ` · ${r.detail}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
