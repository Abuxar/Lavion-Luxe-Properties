"use client";

import { useActionState, useState } from "react";
import { ImageUploader, type UploadedImage } from "@/components/image-uploader";
import { createListingAction, type ActionState } from "../actions";

const initial: ActionState = { status: "idle" };

type Market = "uk" | "ae" | "pk";

const UNITS: Record<Market, { value: string; label: string }[]> = {
  uk: [{ value: "sqft", label: "sq ft" }, { value: "sqm", label: "m²" }],
  ae: [{ value: "sqft", label: "sq ft" }, { value: "sqm", label: "m²" }],
  pk: [
    { value: "marla", label: "Marla" },
    { value: "kanal", label: "Kanal" },
    { value: "sqft", label: "sq ft" },
  ],
};

const CURRENCY: Record<Market, string> = { uk: "GBP £", ae: "AED", pk: "PKR Rs" };

export function NewListingForm() {
  const [state, action, pending] = useActionState(createListingAction, initial);
  const [market, setMarket] = useState<Market>("ae");
  const [tenure, setTenure] = useState("freehold");
  const [offPlan, setOffPlan] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [urls, setUrls] = useState("");

  const issues = state.status === "error" ? (state.fieldIssues ?? {}) : {};

  return (
    <form action={action} className="flex flex-col gap-10">
      {/* ---- market ---- */}
      <fieldset>
        <legend className="label">Market</legend>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["uk", "ae", "pk"] as Market[]).map((m) => (
            <label
              key={m}
              className={`cursor-pointer border px-5 py-3 text-sm transition-colors ${
                market === m
                  ? "border-brass bg-brass-wash text-brass"
                  : "border-line hover:border-brass"
              }`}
            >
              <input
                type="radio"
                name="market"
                value={m}
                checked={market === m}
                onChange={() => setMarket(m)}
                className="sr-only"
              />
              {m === "uk" ? "United Kingdom" : m === "ae" ? "United Arab Emirates" : "Pakistan"}
            </label>
          ))}
        </div>
      </fieldset>

      {/* ---- details ---- */}
      <Group title="Property details">
        <F label="Listing title" name="title" required span2 issues={issues}
           hint="8–160 characters. This is the page heading and the SEO title." />

        <S label="Listing type" name="transaction" options={[
          { value: "sale", label: "For sale" }, { value: "rent", label: "To rent" }]} />

        <S label="Property type" name="category" options={[
          "apartment","villa","townhouse","penthouse","house","flat","plot","office","retail","warehouse",
        ].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))} />

        <F label={`Price (${CURRENCY[market]})`} name="amount" type="number" required issues={issues} />

        <S label="Price qualifier" name="qualifier" options={[
          { value: "asking", label: "Asking price" },
          { value: "offers_over", label: "Offers over" },
          { value: "offers_in_region", label: "Offers in region of" },
          { value: "from", label: "From" },
          { value: "poa", label: "Price on application" },
        ]} />

        <div className="grid grid-cols-2 gap-3">
          <F label="Area" name="areaValue" type="number" required issues={issues} />
          <S label="Unit" name="areaUnit" options={UNITS[market]} />
        </div>

        <S label="Tenure" name="tenure" value={tenure} onChange={setTenure} options={[
          { value: "freehold", label: "Freehold" },
          { value: "leasehold", label: "Leasehold" },
          { value: "commonhold", label: "Commonhold" },
        ]} />

        <F label="Bedrooms" name="bedrooms" type="number" issues={issues} />
        <F label="Bathrooms" name="bathrooms" type="number" issues={issues} />

        <T label="Description" name="description" required issues={issues}
           rows={6} hint="At least 20 characters. Written for buyers, not for search engines." />

        <T label="Amenities" name="amenities" rows={3} issues={issues}
           hint="One per line, or comma separated. e.g. Private pool, Concierge, Covered parking" />

        {market === "ae" && (
          <C label="This is an off-plan property" name="offPlan" checked={offPlan} onChange={setOffPlan} />
        )}
      </Group>

      {/* ---- location ---- */}
      <Group title="Location"
        note="Address shape differs by market — the UK has postcodes, most emirates address by area and building, Pakistan by society and phase. Fill what applies.">
        <T label="Address" name="addressLine" rows={2} issues={issues}
           hint="One line per address line." />
        <F label="Area / locality" name="locality" required issues={issues}
           hint={market === "pk" ? "e.g. DHA Phase 6" : market === "ae" ? "e.g. Dubai Marina" : "e.g. Chelsea"} />
        <F label="City" name="city" required issues={issues} />
        <F label="Region / emirate / province" name="region" issues={issues} />
        {market === "uk" && <F label="Postcode" name="postcode" issues={issues} />}
        <F label="Latitude" name="lat" issues={issues} hint="Optional — enables map search later." />
        <F label="Longitude" name="lng" issues={issues} />
        {market === "ae" && (
          <C label="Located in a designated freehold area (required for Golden Visa eligibility)"
             name="freeholdZone" />
        )}
      </Group>

      {/* ---- images ---- */}
      <Group title="Photos"
        note="Upload from this device — on a phone the picker offers the camera, your photo library and files. Images are resized before upload so a phone photo does not cost the viewer their LCP.">
        <ImageUploader value={images} onChange={setImages} name="media" />

        <details className="sm:col-span-2">
          <summary className="label cursor-pointer">Or paste image URLs</summary>
          <div className="mt-3">
            <textarea
              name="mediaUrls"
              rows={3}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              placeholder="https://…&#10;/samples/marina-penthouse.svg"
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-ink-faint">
              One per line. Cloudinary public IDs work here too once that account is connected.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["marina-penthouse","creek-horizon","chelsea-townhouse","marylebone-flat","dha-villa","clifton-apartment"].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    setUrls((m) => [m, `/samples/${n}.svg`].filter(Boolean).join("\n"))
                  }
                  className="label border border-line px-3 py-1.5 transition-colors hover:border-brass"
                >
                  + {n.replace(/-/g, " ")}
                </button>
              ))}
            </div>
          </div>
        </details>
      </Group>

      {/* ---- compliance ---- */}
      {market === "ae" && (
        <Group title="Dubai advertising permit"
          note="Dubai Land Department requires a permit number on every property advertisement. Without it the listing cannot be published — only overridden.">
          <F label="DLD permit number (Trakheesi)" name="ae_permitNumber" issues={issues} />
          <F label="Permit expiry" name="ae_permitExpiry" type="date" issues={issues}
             hint="Lapsed permits are withdrawn automatically." />
          {offPlan && (
            <>
              <F label="Developer name" name="ae_developerName" issues={issues} />
              <F label="Escrow account number" name="ae_escrowAccount" issues={issues} />
              <F label="Expected completion" name="ae_completionDate" type="date" issues={issues} />
            </>
          )}
        </Group>
      )}

      {market === "uk" && (
        <Group title="Material information"
          note="Required by National Trading Standards on property listings. Part A blocks publication; Part B is a compliance gap we chase.">
          <F label="Council tax band" name="uk_councilTaxBand" issues={issues} />
          <F label="EPC rating" name="uk_epcRating" issues={issues} />
          <F label="Construction materials" name="uk_constructionMaterials" issues={issues} />
          <F label="Parking" name="uk_parking" issues={issues} />
          {tenure === "leasehold" && (
            <>
              <F label="Years remaining on lease" name="uk_leaseholdYearsRemaining" type="number" issues={issues} />
              <F label="Annual service charge (£)" name="uk_serviceChargeAnnual" type="number" issues={issues} />
              <F label="Annual ground rent (£)" name="uk_groundRentAnnual" type="number" issues={issues} />
            </>
          )}
        </Group>
      )}

      {market === "pk" && (
        <Group title="Verification"
          note="Optional, but a society approval reference marks the listing verified — which is what overseas buyers look for.">
          <F label="Society / scheme name" name="pk_societyName" issues={issues} />
          <F label="Approval reference" name="pk_societyApprovalRef" issues={issues} />
          <F label="Transfer authority" name="pk_transferAuthority" issues={issues} />
        </Group>
      )}

      <PublishControls pending={pending} state={state} />
    </form>
  );
}

function PublishControls({ pending, state }: { pending: boolean; state: ActionState }) {
  const [override, setOverride] = useState(false);

  return (
    <div className="border-t border-line pt-8">
      <label className="flex items-center gap-3">
        <input type="checkbox" name="publishNow" defaultChecked className="h-4 w-4 accent-[var(--color-brass)]" />
        <span className="text-sm">Publish immediately if it clears the gate</span>
      </label>

      <label className="mt-4 flex items-start gap-3">
        <input
          type="checkbox"
          name="override"
          value="yes"
          checked={override}
          onChange={(e) => setOverride(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[var(--color-signal)]"
        />
        <span className="text-sm">
          <span style={{ color: "var(--color-signal)" }}>Publish anyway even if blocked</span>
          <span className="mt-1 block text-xs leading-relaxed text-ink-faint">
            Bypasses the legal disclosure check. Does not make the advert lawful —
            the bypass and its reason are recorded on the listing so it can be found later.
          </span>
        </span>
      </label>

      {override && (
        <div className="mt-4 max-w-md">
          <label htmlFor="overrideReason" className="label block">
            Override reason
          </label>
          <input
            id="overrideReason"
            name="overrideReason"
            required
            minLength={4}
            defaultValue="Testing"
            className="mt-2 w-full border border-signal/50 bg-signal-wash px-4 py-3 text-sm outline-none"
          />
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="bg-ink px-8 py-4 text-sm font-medium text-paper transition-colors hover:bg-brass disabled:opacity-50"
        >
          {pending ? "Saving…" : "Create listing"}
        </button>
      </div>

      {state.status === "ok" && (
        <p className="mt-5 text-sm" style={{ color: "var(--color-brass)" }}>
          {state.message}
        </p>
      )}
      {state.status === "error" && (
        <p className="mt-5 text-sm" style={{ color: "var(--color-signal)" }}>
          {state.message}
        </p>
      )}
      {state.status === "blocked" && (
        <div className="mt-5 border border-signal/40 bg-signal-wash p-5">
          <p className="text-sm font-medium" style={{ color: "var(--color-signal)" }}>
            {state.message}
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {state.failures.map((f) => (
              <li key={f.code} className="text-xs text-ink-soft">
                {f.message} <span className="text-ink-faint">· {f.authority}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-faint">
            Tick “Publish anyway even if blocked” to override.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------- primitives ---------- */

const inputCls =
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

function F({ label, name, type = "text", required, hint, span2, issues }: {
  label: string; name: string; type?: string; required?: boolean;
  hint?: string; span2?: boolean; issues: Record<string, string>;
}) {
  const err = issues[name];
  return (
    <div className={span2 ? "sm:col-span-2" : undefined}>
      <label htmlFor={name} className="label block">
        {label}{required && <span aria-hidden> *</span>}
      </label>
      <input id={name} name={name} type={type} required={required} className={inputCls} />
      {hint && !err && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
      {err && <p className="mt-1.5 text-xs" style={{ color: "var(--color-signal)" }}>{err}</p>}
    </div>
  );
}

function T({ label, name, rows = 4, required, hint, issues, value, onChange }: {
  label: string; name: string; rows?: number; required?: boolean;
  hint?: string; issues: Record<string, string>;
  value?: string; onChange?: (v: string) => void;
}) {
  const err = issues[name];
  return (
    <div className="sm:col-span-2">
      <label htmlFor={name} className="label block">
        {label}{required && <span aria-hidden> *</span>}
      </label>
      <textarea
        id={name} name={name} rows={rows} required={required} className={inputCls}
        {...(onChange ? { value, onChange: (e) => onChange(e.target.value) } : {})}
      />
      {hint && !err && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
      {err && <p className="mt-1.5 text-xs" style={{ color: "var(--color-signal)" }}>{err}</p>}
    </div>
  );
}

function S({ label, name, options, value, onChange }: {
  label: string; name: string; options: { value: string; label: string }[];
  value?: string; onChange?: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={name} className="label block">{label}</label>
      <select
        id={name} name={name} className={inputCls}
        {...(onChange ? { value, onChange: (e) => onChange(e.target.value) } : {})}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function C({ label, name, checked, onChange }: {
  label: string; name: string; checked?: boolean; onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 sm:col-span-2">
      <input
        type="checkbox" name={name} className="mt-1 h-4 w-4 accent-[var(--color-brass)]"
        {...(onChange ? { checked, onChange: (e) => onChange(e.target.checked) } : {})}
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}
