"use client";

import { useActionState, useState } from "react";
import type { Market } from "@lavion/schema";
import { ImageUploader, type UploadedImage } from "@/components/image-uploader";
import { submitPropertyAction, type ActionState } from "@/app/admin/actions";

const initial: ActionState = { status: "idle" };

const UNITS: Record<Market, { value: string; label: string }[]> = {
  uk: [{ value: "sqft", label: "sq ft" }],
  ae: [{ value: "sqft", label: "sq ft" }],
  pk: [
    { value: "marla", label: "Marla" },
    { value: "kanal", label: "Kanal" },
    { value: "sqft", label: "sq ft" },
  ],
};

export function SubmitForm({ market }: { market: Market }) {
  const [state, action, pending] = useActionState(submitPropertyAction, initial);
  const [offPlan, setOffPlan] = useState(false);
  const [tenure, setTenure] = useState("freehold");
  const [images, setImages] = useState<UploadedImage[]>([]);

  const issues = state.status === "error" ? (state.fieldIssues ?? {}) : {};

  if (state.status === "ok" || state.status === "blocked") {
    return (
      <div className="border border-line bg-surface p-8">
        <p className="label !text-brass">Received</p>
        <p className="mt-3 max-w-[55ch] leading-relaxed">{state.message}</p>

        {state.status === "blocked" && (
          <ul className="mt-6 flex flex-col gap-4 border-t border-line pt-6">
            {state.failures.map((f) => (
              <li key={f.code}>
                <p className="text-sm font-medium">{f.message}</p>
                <p className="label mt-1 !normal-case !tracking-normal">{f.authority}</p>
              </li>
            ))}
          </ul>
        )}

        <a href={`/${market}/submit`} className="label mt-8 inline-block hover:text-brass">
          Submit another &rarr;
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-10">
      <input type="hidden" name="market" value={market} />

      <Section title="About you">
        <Field label="Your name" name="submitterName" required issues={issues} />
        <Field label="Email" name="submitterEmail" type="email" required issues={issues} />
      </Section>

      <Section title="The property">
        <Field
          label="Listing title"
          name="title"
          required
          span2
          issues={issues}
          hint="At least 8 characters — e.g. “Three-bedroom apartment with skyline views, Business Bay”"
        />

        <Select label="Listing type" name="transaction" options={[
          { value: "sale", label: "For sale" },
          { value: "rent", label: "To rent" },
        ]} />

        <Select label="Property type" name="category" options={[
          "apartment", "villa", "townhouse", "penthouse", "house", "flat", "plot",
          "office", "retail", "warehouse",
        ].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))} />

        <Field label="Price" name="amount" type="number" required issues={issues}
          hint={market === "uk" ? "GBP" : market === "ae" ? "AED" : "PKR"} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Area" name="areaValue" type="number" required issues={issues} />
          <Select label="Unit" name="areaUnit" options={UNITS[market]} />
        </div>

        <Field label="Bedrooms" name="bedrooms" type="number" issues={issues} />
        <Field label="Bathrooms" name="bathrooms" type="number" issues={issues} />

        <Select
          label="Tenure"
          name="tenure"
          value={tenure}
          onChange={setTenure}
          options={[
            { value: "freehold", label: "Freehold" },
            { value: "leasehold", label: "Leasehold" },
            { value: "commonhold", label: "Commonhold" },
          ]}
        />

        <Field label="Area / locality" name="locality" required issues={issues} />
        <Field label="City" name="city" required issues={issues} />

        <TextArea label="Description" name="description" required issues={issues}
          hint="At least 20 characters." />

        {market === "ae" && (
          <Checkbox label="This is an off-plan property" name="offPlan"
            checked={offPlan} onChange={setOffPlan} />
        )}
        {market === "ae" && (
          <Checkbox label="Located in a designated freehold area" name="freeholdZone" />
        )}
      </Section>

      <Section
        title="Photos"
        note="Add photos straight from this device — on a phone the picker offers your camera, photo library and files. Listings with photos get far more enquiries."
      >
        <ImageUploader value={images} onChange={setImages} name="media" />
      </Section>

      {/* Market-specific requirements, surfaced with WHY they are needed. */}
      {market === "ae" && (
        <Section
          title="Dubai advertising permit"
          note="Dubai Land Department rules require a permit number on every property advertisement. Without it we cannot publish the listing."
        >
          <Field label="DLD permit number (Trakheesi)" name="ae_permitNumber" issues={issues} />
          <Field label="Permit expiry" name="ae_permitExpiry" type="date" issues={issues} />
          {offPlan && (
            <>
              <Field label="Developer name" name="ae_developerName" issues={issues} />
              <Field label="Escrow account number" name="ae_escrowAccount" issues={issues} />
              <Field label="Expected completion" name="ae_completionDate" type="date" issues={issues} />
            </>
          )}
        </Section>
      )}

      {market === "uk" && (
        <Section
          title="Material information"
          note="National Trading Standards requires these on property listings. Part A details are needed before we can publish."
        >
          <Field label="Council tax band" name="uk_councilTaxBand" issues={issues} />
          <Field label="EPC rating" name="uk_epcRating" issues={issues} />
          <Field label="Construction materials" name="uk_constructionMaterials" issues={issues} />
          {tenure === "leasehold" && (
            <>
              <Field label="Years remaining on lease" name="uk_leaseholdYearsRemaining" type="number" issues={issues} />
              <Field label="Annual service charge (£)" name="uk_serviceChargeAnnual" type="number" issues={issues} />
              <Field label="Annual ground rent (£)" name="uk_groundRentAnnual" type="number" issues={issues} />
            </>
          )}
        </Section>
      )}

      {market === "pk" && (
        <Section
          title="Verification"
          note="Optional, but listings with a society approval reference are marked verified — which is what buyers abroad look for."
        >
          <Field label="Society / scheme name" name="pk_societyName" issues={issues} />
          <Field label="Approval reference" name="pk_societyApprovalRef" issues={issues} />
          <Field label="Transfer authority" name="pk_transferAuthority" issues={issues} />
        </Section>
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
        <p className="max-w-[42ch] text-xs leading-relaxed text-ink-faint">
          Nothing goes live automatically. Every submission is checked by our
          team against the disclosure rules for its market before it appears.
        </p>
      </div>
    </form>
  );
}

/* ---------- field primitives ---------- */

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="label">{title}</legend>
      {note && <p className="mt-2 max-w-[60ch] text-sm text-ink-soft">{note}</p>}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

const inputCls =
  "mt-2 w-full border border-line bg-paper px-4 py-3 text-sm outline-none focus-visible:border-brass";

function Field({
  label,
  name,
  type = "text",
  required,
  hint,
  span2,
  issues,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  hint?: string;
  span2?: boolean;
  issues: Record<string, string>;
}) {
  const err = issues[name] ?? issues[`${name.split("_")[0]}.${name.split("_")[1] ?? ""}`];
  return (
    <div className={span2 ? "sm:col-span-2" : undefined}>
      <label htmlFor={name} className="label block">
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      <input id={name} name={name} type={type} required={required} className={inputCls} />
      {hint && !err && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
      {err && (
        <p className="mt-1.5 text-xs" style={{ color: "var(--color-signal)" }}>
          {err}
        </p>
      )}
    </div>
  );
}

function TextArea({
  label,
  name,
  required,
  hint,
  issues,
}: {
  label: string;
  name: string;
  required?: boolean;
  hint?: string;
  issues: Record<string, string>;
}) {
  const err = issues[name];
  return (
    <div className="sm:col-span-2">
      <label htmlFor={name} className="label block">
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
      <textarea id={name} name={name} rows={5} required={required} className={inputCls} />
      {hint && !err && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
      {err && (
        <p className="mt-1.5 text-xs" style={{ color: "var(--color-signal)" }}>
          {err}
        </p>
      )}
    </div>
  );
}

function Select({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={name} className="label block">
        {label}
      </label>
      <select
        id={name}
        name={name}
        className={inputCls}
        {...(onChange ? { value, onChange: (e) => onChange(e.target.value) } : {})}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Checkbox({
  label,
  name,
  checked,
  onChange,
}: {
  label: string;
  name: string;
  checked?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 sm:col-span-2">
      <input
        type="checkbox"
        name={name}
        className="h-4 w-4 accent-[var(--color-brass)]"
        {...(onChange ? { checked, onChange: (e) => onChange(e.target.checked) } : {})}
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}
