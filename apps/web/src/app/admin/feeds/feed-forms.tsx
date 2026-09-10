"use client";

import { useActionState, useState } from "react";
import type { FeedSource } from "@lavion/schema";
import { createSourceAction, runFeedAction, type FeedState } from "./actions";

const initial: FeedState = { status: "idle" };

const SAMPLE_MAPPING = `externalRef=ref
title=headline
price=askingPrice
area=size
bedrooms=beds
locality=area_name
city=town
permitNumber=permit`;

export function AddSourceForm() {
  const [state, action, pending] = useActionState(createSourceAction, initial);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="label border border-brass/50 bg-brass-wash px-4 py-2 !text-brass transition-colors hover:border-brass"
      >
        + Add feed source
      </button>
    );
  }

  return (
    <form action={action} className="mt-6 border border-line bg-surface p-6">
      <p className="label">New feed source</p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field name="agencyName" label="Agency name" required />
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
          name="format"
          label="Format"
          options={[
            { value: "csv", label: "CSV" },
            { value: "json", label: "JSON" },
          ]}
        />
        <Field
          name="url"
          label="Feed URL"
          hint="Optional — leave blank to paste the file each time."
        />

        <div className="sm:col-span-2">
          <label htmlFor="mapping" className="label block">
            Column mapping
          </label>
          <textarea
            id="mapping"
            name="mapping"
            rows={7}
            defaultValue={SAMPLE_MAPPING}
            spellCheck={false}
            className="mt-2 w-full border border-line bg-paper px-3 py-2.5 font-mono text-xs outline-none focus-visible:border-brass"
          />
          <p className="mt-1.5 text-xs text-ink-faint">
            One per line, <code>ourField=theirColumn</code>. Anything already
            named correctly needs no mapping.
          </p>
        </div>

        <label className="flex items-start gap-3 sm:col-span-2">
          <input type="checkbox" name="autoPublish" className="mt-1 h-4 w-4 accent-[var(--color-brass)]" />
          <span className="text-sm">
            Publish automatically when a listing clears its compliance gates
            <span className="mt-1 block text-xs leading-relaxed text-ink-faint">
              Off by default. Gates still apply either way — this only decides
              whether a clean listing skips the review queue.
            </span>
          </span>
        </label>
      </div>

      {state.status === "error" && (
        <p className="mt-4 text-sm" style={{ color: "var(--color-signal)" }}>
          {state.message}
        </p>
      )}
      {state.status === "ok" && (
        <p className="mt-4 text-sm" style={{ color: "var(--color-brass)" }}>
          {state.message}
        </p>
      )}

      <div className="mt-6 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-ink px-6 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-brass disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add source"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="border border-line px-5 py-3.5 text-sm transition-colors hover:border-brass"
        >
          Close
        </button>
      </div>
    </form>
  );
}

export function RunFeedForm({ source }: { source: FeedSource }) {
  const [state, action, pending] = useActionState(runFeedAction, initial);
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="label border border-line px-3 py-2 transition-colors hover:border-brass"
        >
          Import
        </button>
      ) : (
        <form action={action} className="border border-line bg-paper p-5">
          <input type="hidden" name="id" value={source.id} />

          <label htmlFor={`p-${source.id}`} className="label block">
            Paste the feed{source.url ? " (or leave blank to fetch the URL)" : ""}
          </label>
          <textarea
            id={`p-${source.id}`}
            name="pasted"
            rows={6}
            spellCheck={false}
            placeholder={
              source.format === "csv"
                ? "ref,headline,askingPrice,size,beds,area_name,town"
                : '[{ "ref": "AG-001", "headline": "…" }]'
            }
            className="mt-2 w-full border border-line bg-surface px-3 py-2.5 font-mono text-xs outline-none focus-visible:border-brass"
          />

          <label className="mt-3 flex items-center gap-2.5">
            <input
              type="checkbox"
              name="dryRun"
              defaultChecked
              className="h-4 w-4 accent-[var(--color-brass)]"
            />
            <span className="text-sm">
              Preview only — parse and report, write nothing
            </span>
          </label>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="bg-ink px-5 py-3 text-sm font-medium text-paper transition-colors hover:bg-brass disabled:opacity-50"
            >
              {pending ? "Running…" : "Run"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="border border-line px-4 py-3 text-sm transition-colors hover:border-brass"
            >
              Cancel
            </button>
          </div>

          {state.status === "error" && (
            <p className="mt-4 text-sm" style={{ color: "var(--color-signal)" }}>
              {state.message}
            </p>
          )}

          {state.status === "run" && <RunReport state={state} />}
        </form>
      )}
    </div>
  );
}

function RunReport({ state }: { state: Extract<FeedState, { status: "run" }> }) {
  const { summary, dryRun, message } = state;

  return (
    <div className="mt-5 border-t border-line pt-5">
      <p className="label" style={{ color: dryRun ? "var(--color-ochre)" : "var(--color-brass)" }}>
        {dryRun ? "Preview — nothing written" : "Import complete"}
      </p>
      <p className="mt-2 text-sm">{message}</p>

      {/* Per row, so a partial import is diagnosable rather than a number. */}
      <div className="mt-4 max-h-72 overflow-y-auto border border-line">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-surface">
            <tr>
              <Th>#</Th>
              <Th>Ref</Th>
              <Th>Title</Th>
              <Th>Outcome</Th>
              <Th>Notes</Th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((r) => (
              <tr key={`${r.row}-${r.externalRef ?? ""}`} className="border-t border-line">
                <Td className="tnum">{r.row}</Td>
                <Td className="font-mono">{r.externalRef ?? "—"}</Td>
                <Td>{(r.title ?? "—").slice(0, 34)}</Td>
                <Td>
                  <span
                    style={{
                      color:
                        r.outcome === "rejected"
                          ? "var(--color-signal)"
                          : r.outcome === "skipped"
                            ? "var(--color-ink-faint)"
                            : "var(--color-brass)",
                    }}
                  >
                    {r.outcome}
                  </span>
                </Td>
                <Td>
                  {r.blockedByGate && (
                    <span className="label" style={{ color: "var(--color-signal)" }}>
                      held by gate:{" "}
                    </span>
                  )}
                  {r.reasons.join("; ") || "—"}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- primitives ---------- */

const cls =
  "mt-2 w-full border border-line bg-paper px-3 py-2.5 text-sm outline-none focus-visible:border-brass";

function Field({
  name,
  label,
  required,
  hint,
}: {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label block">
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      <input id={name} name={name} required={required} className={cls} />
      {hint && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
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

function Th({ children }: { children: React.ReactNode }) {
  return <th className="label px-3 py-2 text-left">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}
