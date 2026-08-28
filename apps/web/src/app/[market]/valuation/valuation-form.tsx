"use client";

import { useActionState } from "react";
import Link from "next/link";
import { MARKETS, type Market } from "@lavion/schema";
import { requestValuationAction, type LeadState } from "@/app/lead-actions";

const initial: LeadState = { status: "idle" };

const UNITS: Record<Market, { value: string; label: string }[]> = {
  uk: [{ value: "sqft", label: "sq ft" }, { value: "sqm", label: "m²" }],
  ae: [{ value: "sqft", label: "sq ft" }, { value: "sqm", label: "m²" }],
  pk: [
    { value: "marla", label: "Marla" },
    { value: "kanal", label: "Kanal" },
    { value: "sqft", label: "sq ft" },
  ],
};

export function ValuationForm({ market }: { market: Market }) {
  const [state, action, pending] = useActionState(requestValuationAction, initial);

  if (state.status === "valued") {
    const e = state.estimate;
    const fmt = (n: number) =>
      new Intl.NumberFormat(MARKETS[market].locale, {
        style: "currency",
        currency: e?.currency ?? MARKETS[market].currency,
        maximumFractionDigits: 0,
      }).format(n);

    return (
      <div className="border border-line bg-surface p-8">
        <p className="label !text-brass">Request received</p>

        {e ? (
          <>
            <h2 className="mt-4 font-display text-2xl">Indicative range</h2>
            <p className="mt-4 font-display text-[clamp(2rem,5vw,3.4rem)] leading-none tnum">
              {fmt(e.low)} <span className="text-ink-faint">—</span> {fmt(e.high)}
            </p>
            <p className="label mt-4 tnum">
              Midpoint {fmt(e.mid)} · {fmt(e.perSqft)} per sq ft
            </p>

            {/* State the sample honestly. A range from three asking prices is
                not a valuation, and pretending otherwise is how a lead-gen
                tool loses the trust it exists to build. */}
            <div className="mt-6 border-t border-line pt-5">
              <p className="text-sm leading-relaxed text-ink-soft">
                Derived from {e.comparableCount}{" "}
                {e.comparableCount === 1 ? "comparable" : "comparables"} at the{" "}
                {e.basis === "locality"
                  ? "same area"
                  : e.basis === "city"
                    ? "city"
                    : "market"}{" "}
                level, using <strong>asking prices</strong> currently listed with us — not
                achieved sale prices. It is a starting point for a conversation,
                not a valuation.
              </p>
            </div>
          </>
        ) : (
          <p className="mt-4 max-w-[55ch] leading-relaxed">
            We do not yet hold enough comparable inventory in that area to show
            an indicative range — which is exactly the case where a proper
            appraisal is worth more than an automated estimate.
          </p>
        )}

        <div className="mt-7 border-t border-line pt-6">
          <p className="text-sm leading-relaxed">
            <strong>{state.agentName}</strong> handles appraisals in your area and will
            be in touch to arrange a full valuation.
          </p>
        </div>

        <Link href={`/${market}`} className="label mt-7 inline-block hover:text-brass">
          Back to {MARKETS[market].label} &rarr;
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-9">
      <input type="hidden" name="market" value={market} />

      <Group title="The property">
        <F name="addressLine" label="Address" span2 />
        <F
          name="locality"
          label="Area"
          required
          hint={
            market === "pk" ? "e.g. DHA Phase 6" : market === "ae" ? "e.g. Dubai Marina" : "e.g. Chelsea"
          }
        />
        <F name="city" label="City" required />
        <S
          name="category"
          label="Property type"
          options={["apartment", "villa", "townhouse", "penthouse", "house", "flat", "plot"].map(
            (v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }),
          )}
        />
        <F name="bedrooms" label="Bedrooms" type="number" />
        <div className="grid grid-cols-2 gap-3">
          <F name="areaValue" label="Size" type="number" required />
          <S name="areaUnit" label="Unit" options={UNITS[market]} />
        </div>
      </Group>

      <Group title="How we reach you">
        <F name="name" label="Your name" required />
        <F name="email" label="Email" type="email" required />
        <F name="phone" label="Phone or WhatsApp" type="tel" />
        <T name="message" label="Anything else" />
      </Group>

      {state.status === "error" && (
        <p className="text-sm" style={{ color: "var(--color-signal)" }}>
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-5 border-t border-line pt-8">
        <button
          type="submit"
          disabled={pending}
          className="bg-ink px-8 py-4 text-sm font-medium text-paper transition-colors hover:bg-brass disabled:opacity-50"
        >
          {pending ? "Checking comparables…" : "Get an indicative range"}
        </button>
        <p className="max-w-[40ch] text-xs leading-relaxed text-ink-faint">
          You will see a range immediately, and an appraiser who covers your area
          will follow up for a full valuation.
        </p>
      </div>
    </form>
  );
}

/* ---------- primitives ---------- */

const cls =
  "mt-2 w-full border border-line bg-paper px-4 py-3 text-sm outline-none focus-visible:border-brass";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="label">{title}</legend>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function F({
  name,
  label,
  type = "text",
  required,
  hint,
  span2,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  hint?: string;
  span2?: boolean;
}) {
  return (
    <div className={span2 ? "sm:col-span-2" : undefined}>
      <label htmlFor={name} className="label block">
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      <input id={name} name={name} type={type} required={required} className={cls} />
      {hint && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

function T({ name, label }: { name: string; label: string }) {
  return (
    <div className="sm:col-span-2">
      <label htmlFor={name} className="label block">
        {label}
      </label>
      <textarea id={name} name={name} rows={4} className={cls} />
    </div>
  );
}

function S({
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
