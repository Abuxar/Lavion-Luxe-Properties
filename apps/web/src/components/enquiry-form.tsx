"use client";

import { useActionState, useState } from "react";
import type { Market } from "@lavion/schema";
import { submitEnquiryAction, type LeadState } from "@/app/lead-actions";

const initial: LeadState = { status: "idle" };

/**
 * Replaces the inert "Request a viewing" button. Opens in place rather than
 * navigating away — a buyer looking at a listing should not lose the listing
 * to send a message about it.
 */
export function EnquiryForm({
  market,
  listingSlug,
  listingTitle,
  locality,
  city,
}: {
  market: Market;
  listingSlug: string;
  listingTitle: string;
  locality: string;
  city: string;
}) {
  const [state, action, pending] = useActionState(submitEnquiryAction, initial);
  const [open, setOpen] = useState(false);

  if (state.status === "ok") {
    return (
      <div className="border border-brass/40 bg-brass-wash p-5">
        <p className="label !text-brass">{state.message}</p>
        <p className="mt-2 text-sm leading-relaxed">
          <strong>{state.agentName}</strong> covers {locality} and will be in touch.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border border-line px-6 py-4 text-sm font-medium transition-colors hover:border-brass"
      >
        Request a viewing
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3 border border-line bg-paper p-5">
      <input type="hidden" name="market" value={market} />
      <input type="hidden" name="kind" value="viewing" />
      <input type="hidden" name="listingSlug" value={listingSlug} />
      <input type="hidden" name="listingTitle" value={listingTitle} />
      <input type="hidden" name="locality" value={locality} />
      <input type="hidden" name="city" value={city} />

      <p className="label">Request a viewing</p>

      <Input name="name" label="Name" required />
      <Input name="email" label="Email" type="email" required />
      <Input name="phone" label="Phone" type="tel" />
      <Input name="preferredDate" label="Preferred date" type="date" />

      <label htmlFor="message" className="label mt-1">
        Anything we should know
      </label>
      <textarea
        id="message"
        name="message"
        rows={3}
        className="border border-line bg-surface px-3 py-2 text-sm outline-none focus-visible:border-brass"
      />

      {state.status === "error" && (
        <p className="text-sm" style={{ color: "var(--color-signal)" }}>
          {state.message}
        </p>
      )}

      <div className="mt-1 flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-ink px-5 py-3 text-sm font-medium text-paper transition-colors hover:bg-brass disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send request"}
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

function Input({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
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
        className="mt-1.5 w-full border border-line bg-surface px-3 py-2 text-sm outline-none focus-visible:border-brass"
      />
    </div>
  );
}
