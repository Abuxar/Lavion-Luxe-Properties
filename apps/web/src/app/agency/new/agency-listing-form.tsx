"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { MARKETS, type Market } from "@lavion/schema";
import { ImageUploader, type UploadedImage } from "@/components/image-uploader";
import { submitAgencyListingAction, type SubmitState } from "./actions";

const initial: SubmitState = { status: "idle" };

const UNITS: Record<Market, { value: string; label: string }[]> = {
  uk: [{ value: "sqft", label: "sq ft" }, { value: "sqm", label: "m²" }],
  ae: [{ value: "sqft", label: "sq ft" }, { value: "sqm", label: "m²" }],
  pk: [
    { value: "marla", label: "Marla" },
    { value: "kanal", label: "Kanal" },
    { value: "sqft", label: "sq ft" },
  ],
};

/**
 * Agency self-serve submission.
 *
 * Narrower than the staff form on purpose: no market picker (it comes from the
 * agency), no publish control and no compliance override. An agency submits;
 * staff review. That is the gated-submission model, and letting a vendor
 * publish their own listing would dissolve it.
 */
export function AgencyListingForm({ market }: { market: Market }) {
  const [state, action, pending] = useActionState(submitAgencyListingAction, initial);
  const [tenure, setTenure] = useState("freehold");
  const [offPlan, setOffPlan] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);

  const issues = state.status === "error" ? (state.fieldIssues ?? {}) : {};

  if (state.status === "ok" || state.status === "held") {
    return (
      <div className="border border-line bg-surface p-8">
        <p className="label !text-brass">Received</p>
        <p className="mt-3 max-w-[58ch] leading-relaxed">{state.message}</p>

        {state.status === "held" && (
          <ul className="mt-6 flex flex-col gap-4 border-t border-line pt-6">
            {state.failures.map((f) => (
              <li key={f.code}>
                <p className="text-sm font-medium">{f.message}</p>
                <p className="label mt-1 !normal-case !tracking-normal">{f.authority}</p>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          <Link
            href="/agency"
            className="bg-ink px-6 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-brass"
          >
            Back to dashboard
          </Link>
          <a
            href="/agency/new"
            className="border border-line px-5 py-3.5 text-sm transition-colors hover:border-brass"
          >
            Add another
          </a>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-10">
      {/* Market is fixed by the agency, so it is stated rather than chosen. */}
      <input type="hidden" name="market" value={market} />

      <Group title="The property">
        <F name="title" label="Listing title" required span2 issues={issues}
           hint="8–160 characters. This becomes the page heading." />
        <S name="transaction" label="Listing type" options={[
          { value: "sale", label: "For sale" }, { value: "rent", label: "To rent" }]} />
        <S name="category" label="Property type" options={[
          "apartment","villa","townhouse","penthouse","house","flat","plot","office","retail","warehouse",
        ].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))} />

        <F name="amount" label={`Price (${MARKETS[market].currencySymbol})`} type="number" required issues={issues} />
        <div className="grid grid-cols-2 gap-3">
          <F name="areaValue" label="Size" type="number" required issues={issues} />
          <S name="areaUnit" label="Unit" options={UNITS[market]} />
        </div>

        <F name="bedrooms" label="Bedrooms" type="number" issues={issues} />
        <F name="bathrooms" label="Bathrooms" type="number" issues={issues} />

        <S name="tenure" label="Tenure" value={tenure} onChange={setTenure} options={[
          { value: "freehold", label: "Freehold" },
          { value: "leasehold", label: "Leasehold" },
          { value: "commonhold", label: "Commonhold" },
        ]} />

        <T name="description" label="Description" required rows={6} issues={issues}
           hint="At least 20 characters. Written for buyers." />
        <T name="amenities" label="Amenities" rows={3} issues={issues}
           hint="One per line or comma separated." />

        {market === "ae" && (
          <C name="offPlan" label="This is an off-plan property" checked={offPlan} onChange={setOffPlan} />
        )}
      </Group>

      <Group title="Location">
        <T name="addressLine" label="Address" rows={2} issues={issues} />
        <F name="locality" label="Area" required issues={issues} />
        <F name="city" label="City" required issues={issues} />
        {market === "uk" && <F name="postcode" label="Postcode" issues={issues} />}
        {market === "ae" && (
          <C name="freeholdZone" label="In a designated freehold area" />
        )}
      </Group>

      <Group title="Photos" note="Upload straight from this device. Listings with photos get far more enquiries.">
        <ImageUploader value={images} onChange={setImages} name="media" />
      </Group>

      {market === "ae" && (
        <Group title="Dubai advertising permit"
          note="Dubai Land Department requires a permit number on every property advertisement. Without it we cannot publish the listing.">
          <F name="ae_permitNumber" label="DLD permit number (Trakheesi)" issues={issues} />
          <F name="ae_permitExpiry" label="Permit expiry" type="date" issues={issues} />
          {offPlan && (
            <>
              <F name="ae_developerName" label="Developer name" issues={issues} />
              <F name="ae_escrowAccount" label="Escrow account number" issues={issues} />
              <F name="ae_completionDate" label="Expected completion" type="date" issues={issues} />
            </>
          )}
        </Group>
      )}

      {market === "uk" && (
        <Group title="Material information"
          note="Required by National Trading Standards. Part A details are needed before we can publish.">
          <F name="uk_councilTaxBand" label="Council tax band" issues={issues} />
          <F name="uk_epcRating" label="EPC rating" issues={issues} />
          <F name="uk_constructionMaterials" label="Construction materials" issues={issues} />
          {tenure === "leasehold" && (
            <>
              <F name="uk_leaseholdYearsRemaining" label="Years remaining on lease" type="number" issues={issues} />
              <F name="uk_serviceChargeAnnual" label="Annual service charge (£)" type="number" issues={issues} />
              <F name="uk_groundRentAnnual" label="Annual ground rent (£)" type="number" issues={issues} />
            </>
          )}
        </Group>
      )}

      {market === "pk" && (
        <Group title="Verification"
          note="Optional, but a society approval reference marks the listing verified — which is what overseas buyers look for.">
          <F name="pk_societyName" label="Society / scheme name" issues={issues} />
          <F name="pk_societyApprovalRef" label="Approval reference" issues={issues} />
          <F name="pk_transferAuthority" label="Transfer authority" issues={issues} />
        </Group>
      )}

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
          {pending ? "Submitting…" : "Submit for review"}
        </button>
        <p className="max-w-[44ch] text-xs leading-relaxed text-ink-faint">
          Every submission is checked against {MARKETS[market].label} disclosure
          rules before it appears. We will tell you straight away if anything is
          missing.
        </p>
      </div>
    </form>
  );
}

/* ---------- primitives ---------- */

const cls =
  "mt-2 w-full border border-line bg-paper px-4 py-3 text-sm outline-none focus-visible:border-brass";

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="label">{title}</legend>
      {note && <p className="mt-2 max-w-[62ch] text-sm text-ink-soft">{note}</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function F({ name, label, type = "text", required, hint, span2, issues }: {
  name: string; label: string; type?: string; required?: boolean;
  hint?: string; span2?: boolean; issues: Record<string, string>;
}) {
  const err = issues[name];
  return (
    <div className={span2 ? "sm:col-span-2" : undefined}>
      <label htmlFor={name} className="label block">
        {label}{required && <span aria-hidden> *</span>}
      </label>
      <input id={name} name={name} type={type} required={required} className={cls} />
      {hint && !err && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
      {err && <p className="mt-1.5 text-xs" style={{ color: "var(--color-signal)" }}>{err}</p>}
    </div>
  );
}

function T({ name, label, rows = 4, required, hint, issues }: {
  name: string; label: string; rows?: number; required?: boolean;
  hint?: string; issues: Record<string, string>;
}) {
  const err = issues[name];
  return (
    <div className="sm:col-span-2">
      <label htmlFor={name} className="label block">
        {label}{required && <span aria-hidden> *</span>}
      </label>
      <textarea id={name} name={name} rows={rows} required={required} className={cls} />
      {hint && !err && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
      {err && <p className="mt-1.5 text-xs" style={{ color: "var(--color-signal)" }}>{err}</p>}
    </div>
  );
}

function S({ name, label, options, value, onChange }: {
  name: string; label: string; options: { value: string; label: string }[];
  value?: string; onChange?: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={name} className="label block">{label}</label>
      <select id={name} name={name} className={cls}
        {...(onChange ? { value, onChange: (e) => onChange(e.target.value) } : {})}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function C({ name, label, checked, onChange }: {
  name: string; label: string; checked?: boolean; onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 sm:col-span-2">
      <input type="checkbox" name={name} className="mt-1 h-4 w-4 accent-[var(--color-brass)]"
        {...(onChange ? { checked, onChange: (e) => onChange(e.target.checked) } : {})} />
      <span className="text-sm">{label}</span>
    </label>
  );
}
