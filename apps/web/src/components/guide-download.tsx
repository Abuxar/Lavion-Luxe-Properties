"use client";

import { useActionState, useState } from "react";
import type { Market } from "@lavion/schema";
import { requestGuideAction, type DownloadState } from "@/app/guide-download-actions";

const initial: DownloadState = { status: "idle" };

/**
 * The gate on F05.
 *
 * The guide itself stays readable on the page — gating the content would cost
 * the organic traffic the guide exists to earn. What is gated is the PDF: the
 * thing worth an email address is a document someone can keep, forward to a
 * spouse, or take to their adviser.
 */
export function GuideDownload({
  market,
  slug,
  title,
}: {
  market: Market;
  slug: string;
  title: string;
}) {
  const [state, action, pending] = useActionState(requestGuideAction, initial);
  const [open, setOpen] = useState(false);

  if (state.status === "ready") {
    return (
      <section className="mt-12 border border-brass/40 bg-brass-wash p-7">
        <p className="label !text-brass">Your guide is ready</p>
        <h2 className="mt-3 font-display text-2xl">{state.title}</h2>
        <p className="mt-3 max-w-[56ch] text-sm leading-relaxed text-ink-soft">
          The link is valid for the next fifteen minutes. A specialist for your
          market will follow up separately.
        </p>
        <a
          href={state.href}
          className="mt-6 inline-flex items-center gap-2 bg-ink px-7 py-4 text-sm font-medium text-paper transition-colors hover:bg-brass"
        >
          <Download />
          Download the PDF
        </a>
      </section>
    );
  }

  return (
    <section className="mt-12 border border-line bg-surface p-7">
      <p className="label !text-brass">Take it with you</p>
      <h2 className="mt-3 font-display text-2xl">Download this guide as a PDF</h2>
      <p className="mt-3 max-w-[58ch] leading-relaxed text-ink-soft">
        Every rule on this page, with its source and the date it was last
        reviewed, in one document you can keep or pass to your adviser.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-6 inline-flex items-center gap-2 bg-ink px-7 py-4 text-sm font-medium text-paper transition-colors hover:bg-brass"
        >
          <Download />
          Get the PDF
        </button>
      ) : (
        <form action={action} className="mt-6 max-w-lg">
          <input type="hidden" name="market" value={market} />
          <input type="hidden" name="slug" value={slug} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="name" label="Name" required />
            <Field name="email" label="Email" type="email" required />
            <Field name="phone" label="Phone or WhatsApp" type="tel" span2 />
          </div>

          {state.status === "error" && (
            <p className="mt-3 text-sm" style={{ color: "var(--color-signal)" }}>
              {state.message}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="bg-ink px-6 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-brass disabled:opacity-50"
            >
              {pending ? "Preparing…" : "Send me the guide"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="border border-line px-5 py-3.5 text-sm transition-colors hover:border-brass"
            >
              Cancel
            </button>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-ink-faint">
            We use this to send the guide and to have a specialist follow up.
            Nothing else, and no third parties.
          </p>
        </form>
      )}
    </section>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  span2,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  span2?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${span2 ? "sm:col-span-2" : ""}`}>
      <span className="label">
        {label}
        {required && <span aria-hidden> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        className="border border-line bg-paper px-3 py-2.5 text-sm outline-none focus-visible:border-brass"
      />
    </label>
  );
}

function Download() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}
