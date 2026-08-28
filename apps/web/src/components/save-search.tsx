"use client";

import { useActionState, useState } from "react";
import type { Market } from "@lavion/schema";
import { saveSearchAction, type SaveState } from "@/app/saved-search-actions";

const initial: SaveState = { status: "idle" };

/**
 * Saves the query the user is currently looking at, keyed to an email.
 *
 * Only offered once a search is actually filtered — following "everything in
 * the UK" is not a useful alert for either side.
 */
export function SaveSearch({
  market,
  queryString,
  summary,
}: {
  market: Market;
  queryString: string;
  summary: string;
}) {
  const [state, action, pending] = useActionState(saveSearchAction, initial);
  const [open, setOpen] = useState(false);

  if (state.status === "ok") {
    return (
      <div className="mt-6 border border-brass/40 bg-brass-wash p-5">
        <p className="label !text-brass">Following this search</p>
        <p className="mt-2 text-sm">{state.message}</p>
        <p className="label mt-2 !normal-case !tracking-normal">{state.label}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 border border-line bg-surface px-5 py-3 text-sm font-medium transition-colors hover:border-brass"
      >
        Save this search
      </button>
    );
  }

  return (
    <form action={action} className="mt-6 border border-line bg-surface p-5">
      <input type="hidden" name="market" value={market} />
      <input type="hidden" name="qs" value={queryString} />

      <p className="label">Save this search</p>
      <p className="mt-2 max-w-[52ch] text-sm text-ink-soft">{summary}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="label">Name</span>
          <input
            name="name"
            className="border border-line bg-paper px-3 py-2 text-sm outline-none focus-visible:border-brass"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label">Email *</span>
          <input
            name="email"
            type="email"
            required
            className="border border-line bg-paper px-3 py-2 text-sm outline-none focus-visible:border-brass"
          />
        </label>
      </div>

      {state.status === "error" && (
        <p className="mt-3 text-sm" style={{ color: "var(--color-signal)" }}>
          {state.message}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-ink px-5 py-3 text-sm font-medium text-paper transition-colors hover:bg-brass disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save search"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="border border-line px-4 py-3 text-sm transition-colors hover:border-brass"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
