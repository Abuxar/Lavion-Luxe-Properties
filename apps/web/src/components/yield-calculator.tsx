"use client";

import { useMemo, useState } from "react";
import { MARKETS, type Market } from "@lavion/schema";

/**
 * The numbers panel, shaped by how property is actually bought in each market.
 *
 *   Pakistan  No loan, no interest: bayana now, balance in full on a fixed date.
 *   UK        Solicitor-led: a deposit at exchange makes it binding, the balance
 *             goes at completion, and the solicitor pays the purchase tax.
 *             No mortgage model — the process is what a buyer plans around.
 *   UAE       Mortgage and deposit: 10% on signing Form F, the balance at
 *             transfer, borrowing held inside the Central Bank's caps.
 *
 * Sources are listed in lib/buying-process.ts. Runs client-side on numbers the
 * buyer controls; every panel says it is an illustration, not advice.
 */

type Fmt = Intl.NumberFormat;

export function YieldCalculator({
  price,
  currency,
  market,
  region,
}: {
  price: number;
  currency: string;
  market: Market;
  /** Resolved from the listing's location — England vs Scotland, Dubai vs Abu Dhabi. */
  region?: string;
}) {
  const locale = MARKETS[market].locale;
  const fmt = useMemo(
    () => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }),
    [locale, currency],
  );

  const heading =
    market === "pk"
      ? "Bayana, balance and yield"
      : market === "uk"
        ? "Exchange, completion and Stamp Duty"
        : "Deposit, mortgage and transfer";

  return (
    // No top margin here: it would collapse through the deferral wrapper and
    // only appear once this mounts. The wrapper carries it instead.
    <section className="border border-line bg-surface p-7">
      <p className="label !text-brass">Run the numbers</p>
      <h2 className="mt-3 font-display text-2xl">{heading}</h2>

      {market === "pk" && <BayanaPlan price={price} fmt={fmt} locale={locale} />}
      {market === "uk" && <ConveyancingPlan price={price} fmt={fmt} locale={locale} region={region} />}
      {market === "ae" && <UaeMortgagePlan price={price} fmt={fmt} region={region} />}
    </section>
  );
}

/** Today plus n days, in the market's own date style. Client-only (ssr:false). */
function useDueLabel(days: number, locale: string) {
  return useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
  }, [days, locale]);
}

function useRent(price: number, grossYieldPct: number) {
  return useState(Math.round((price * (grossYieldPct / 100)) / 12));
}

const yieldPct = (monthlyRent: number, price: number) =>
  price > 0 ? ((monthlyRent * 12) / price) * 100 : 0;

/* ---------- Pakistan ---------- */

function BayanaPlan({ price, fmt, locale }: { price: number; fmt: Fmt; locale: string }) {
  // DHA practice: bayana commonly around 25% on stamp paper, balance at transfer.
  const [pct, setPct] = useState(25);
  const [days, setDays] = useState(45);
  const [rent, setRent] = useRent(price, 5);

  const bayana = Math.round(price * (pct / 100));
  const due = useDueLabel(days, locale);

  return (
    <>
      <Grid
        left={
          <>
            <Slider label="Bayana to the seller" value={pct} min={5} max={50} step={1} suffix="%"
              hint={fmt.format(bayana)} onChange={setPct} />
            <Slider label="Balance due in" value={days} min={7} max={180} step={1} suffix=" days" onChange={setDays} />
            <RentInput value={rent} onChange={setRent} />
          </>
        }
        right={
          <>
            <Figure k="Bayana now" v={fmt.format(bayana)} accent />
            <Figure k={`Balance at transfer · by ${due}`} v={fmt.format(Math.max(0, price - bayana))} />
            <Figure k="Interest" v="None" />
            <Figure k="Total paid" v={fmt.format(price)} />
            <Figure k="Gross rental yield" v={`${yieldPct(rent, price).toFixed(2)}%`} accent />
          </>
        }
      />
      <Footnote>
        No loan and no interest — the agreed price is the price paid. Before the
        bayana a small token, often PKR 25,000–100,000, usually holds the property.
        The transfer fee, stamp duty and advance tax (236K) are extra and depend
        on the city and your filer status. Gross yield only. An illustration, not
        a quote or financial advice.
      </Footnote>
    </>
  );
}

/* ---------- UK ---------- */

/**
 * Stamp Duty Land Tax, England and Northern Ireland, residential — GOV.UK
 * rates as published September 2026. Surcharges apply to the whole price:
 * 5% on an additional property, 2% for a non-UK resident. First-time buyer
 * relief only up to £500,000, and never alongside the additional-property rate.
 */
function stampDuty(price: number, o: { firstTime: boolean; additional: boolean; nonResident: boolean }) {
  const firstTimeRelief = o.firstTime && !o.additional && price <= 500_000;
  const bands: [number, number][] = firstTimeRelief
    ? [[300_000, 0], [500_000, 0.05]]
    : [[125_000, 0], [250_000, 0.02], [925_000, 0.05], [1_500_000, 0.1], [Infinity, 0.12]];

  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of bands) {
    if (price > lower) tax += (Math.min(price, upper) - lower) * rate;
    lower = upper;
  }
  tax += price * ((o.additional ? 0.05 : 0) + (o.nonResident ? 0.02 : 0));
  return { tax: Math.round(tax), firstTimeRelief };
}

function ConveyancingPlan({
  price,
  fmt,
  locale,
  region,
}: {
  price: number;
  fmt: Fmt;
  locale: string;
  region?: string;
}) {
  const [depositPct, setDepositPct] = useState(10);
  const [days, setDays] = useState(14);
  const [firstTime, setFirstTime] = useState(false);
  const [additional, setAdditional] = useState(false);
  const [nonResident, setNonResident] = useState(false);
  const [rent, setRent] = useRent(price, 4.5);

  const deposit = Math.round(price * (depositPct / 100));
  const due = useDueLabel(days, locale);

  // Scotland and Wales have their own purchase taxes with their own bands.
  // Not calculated here rather than calculated wrongly.
  const devolved = region === "Scotland" ? "LBTT" : region === "Wales" ? "LTT" : null;
  const sd = stampDuty(price, { firstTime, additional, nonResident });

  return (
    <>
      <Grid
        left={
          <>
            <Slider label="Deposit at exchange" value={depositPct} min={5} max={20} step={1} suffix="%"
              hint={fmt.format(deposit)} onChange={setDepositPct} />
            <Slider label="Completion after exchange" value={days} min={0} max={56} step={1}
              suffix={days === 0 ? " (same day)" : " days"} onChange={setDays} />
            {!devolved && (
              <fieldset className="flex flex-col gap-2.5">
                <legend className="label">Stamp Duty applies as</legend>
                <Check label="First-time buyer" on={firstTime && !additional} disabled={additional}
                  onChange={setFirstTime} />
                <Check label="Buying an additional property (+5%)" on={additional} onChange={setAdditional} />
                <Check label="Not UK resident (+2%)" on={nonResident} onChange={setNonResident} />
              </fieldset>
            )}
            <RentInput value={rent} onChange={setRent} />
          </>
        }
        right={
          <>
            <Figure k="At exchange — binding" v={fmt.format(deposit)} accent />
            <Figure k={`Balance at completion · by ${due}`} v={fmt.format(Math.max(0, price - deposit))} />
            {devolved ? (
              <Figure k={`${devolved} (${region})`} v="Own rates" />
            ) : (
              <Figure
                k={`Stamp Duty · ${price > 0 ? ((sd.tax / price) * 100).toFixed(1) : "0"}%${sd.firstTimeRelief ? " · first-time relief" : ""}`}
                v={fmt.format(sd.tax)}
              />
            )}
            <Figure k="Total to complete" v={fmt.format(price + (devolved ? 0 : sd.tax))} />
            <Figure k="Gross rental yield" v={`${yieldPct(rent, price).toFixed(2)}%`} accent />
          </>
        }
      />
      <Footnote>
        {devolved
          ? `${region} has its own purchase tax (${devolved}) with different bands; your solicitor calculates it. `
          : "Stamp Duty at the GOV.UK residential rates for England and Northern Ireland, paid by your solicitor within 14 days of completion. First-time buyer relief applies only up to £500,000. "}
        The total excludes your solicitor&rsquo;s fees and searches. Gross yield only.
        An illustration, not a quote or tax advice.
      </Footnote>
    </>
  );
}

/* ---------- UAE ---------- */

/**
 * Central Bank lending caps for expatriate buyers (loan as a share of value):
 * 80% on a first home up to AED 5m, 70% above that, 60% on a second home or
 * investment property. The deposit slider cannot go below what they imply.
 */
function minDownPct(price: number, second: boolean) {
  if (second) return 40;
  return price <= 5_000_000 ? 20 : 30;
}

/** Dubai Land Department sale registration schedule (dubailand.gov.ae). */
function dldFees(price: number) {
  const transfer = Math.round(price * 0.04);
  const trustee = price >= 500_000 ? 4_000 * 1.05 : 2_000 * 1.05;
  const titleDeed = 250 + 20; // title deed + knowledge and innovation fees
  return { transfer, other: Math.round(trustee + titleDeed) };
}

function UaeMortgagePlan({ price, fmt, region }: { price: number; fmt: Fmt; region?: string }) {
  const [second, setSecond] = useState(false);
  const floor = minDownPct(price, second);
  const [downPct, setDownPct] = useState(floor);
  const [ratePct, setRatePct] = useState(4.5);
  const [years, setYears] = useState(25);
  const [rent, setRent] = useRent(price, 6.5);

  // Moving into a stricter cap lifts the deposit rather than leaving it below
  // what a lender is allowed to accept.
  const down = Math.max(downPct, floor);

  const { loan, monthly, totalInterest } = useMemo(() => {
    const loan = Math.max(0, price - Math.round(price * (down / 100)));
    const r = ratePct / 100 / 12;
    const n = years * 12;
    const monthly = r === 0 ? (n ? loan / n : 0) : (loan * r) / (1 - Math.pow(1 + r, -n));
    return { loan, monthly: Math.round(monthly), totalInterest: Math.round(monthly * n - loan) };
  }, [price, down, ratePct, years]);

  const securityPct = Math.min(10, down);
  const security = Math.round(price * (securityPct / 100));
  const dubai = region === "Dubai";
  const fees = dldFees(price);

  return (
    <>
      <Grid
        left={
          <>
            <Check label="Second home or investment property" on={second} onChange={setSecond} />
            <Slider label="Down payment" value={down} min={floor} max={100} step={1} suffix="%"
              hint={fmt.format(Math.round(price * (down / 100)))} onChange={setDownPct} />
            <Slider label="Interest rate" value={ratePct} min={0} max={15} step={0.1} suffix="%" onChange={setRatePct} />
            <Slider label="Term" value={years} min={5} max={25} step={1} suffix=" yrs" onChange={setYears} />
            <RentInput value={rent} onChange={setRent} />
          </>
        }
        right={
          <>
            <Figure k="Monthly repayment" v={fmt.format(monthly)} accent />
            <Figure k={`Loan · ${100 - down}% of value`} v={fmt.format(loan)} />
            <Figure k="Total interest over term" v={fmt.format(totalInterest)} />
            <Figure k="Gross rental yield" v={`${yieldPct(rent, price).toFixed(2)}%`} accent />
            <Figure
              k="Rent minus repayment"
              v={`${rent - monthly >= 0 ? "+" : ""}${fmt.format(rent - monthly)}`}
              tone={rent - monthly >= 0 ? "good" : "bad"}
            />
          </>
        }
      />

      <p className="label mt-8">When the money moves</p>
      <div className={`mt-3 grid gap-px border border-line bg-line ${dubai ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <Stage label={`On signing Form F · ${securityPct}%`} value={fmt.format(security)}
          note="Security deposit, usually a cheque held by the agent until transfer." />
        <Stage label={`At transfer · ${100 - securityPct}%`} value={fmt.format(price - security)}
          note="The balance, from your funds and the mortgage." />
        {dubai && (
          <Stage label="Dubai Land Department" value={fmt.format(fees.transfer + fees.other)}
            note="4% transfer fee plus the trustee office and title deed fees." />
        )}
      </div>

      <Footnote>
        Down payment floored at the UAE Central Bank&rsquo;s caps for expatriates: at
        least 20% on a first home up to AED 5m, 30% above that, 40% on a second home
        or investment. Non-residents are set by each bank, often higher.
        {dubai
          ? " The 4% is 2% buyer and 2% seller on the Land Department's schedule; buyers often pay all of it."
          : " Transfer fees are set by each emirate's land department and are not calculated here."}{" "}
        Gross yield only. An illustration, not a mortgage quote or financial advice.
      </Footnote>
    </>
  );
}

/* ---------- primitives ---------- */

function Grid({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
      <div className="flex flex-col gap-5">{left}</div>
      <div className="flex flex-col gap-px bg-line">{right}</div>
    </div>
  );
}

function Stage({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="bg-paper p-4">
      <p className="label">{label}</p>
      <p className="mt-2 font-display text-xl tabular-nums break-words text-ink">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{note}</p>
    </div>
  );
}

function Footnote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-ink-faint">{children}</p>
  );
}

function Check({
  label,
  on,
  onChange,
  disabled,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center gap-3 text-sm ${disabled ? "opacity-50" : ""}`}>
      <input
        type="checkbox"
        checked={on}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--color-brass)]"
      />
      {label}
    </label>
  );
}

function RentInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">Expected monthly rent</span>
      <input
        type="number"
        value={value}
        min={0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="border border-line bg-paper px-3 py-2.5 text-sm tabular-nums outline-none focus-visible:border-brass"
      />
    </label>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  hint?: string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between gap-3">
        <span className="label">{label}</span>
        <span className="text-sm font-medium tabular-nums">
          {value}
          {suffix}
          {hint && <span className="ml-2 text-ink-faint">{hint}</span>}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded bg-surface-2 accent-[var(--color-brass)]"
      />
    </label>
  );
}

function Figure({
  k,
  v,
  accent,
  tone,
}: {
  k: string;
  v: string;
  accent?: boolean;
  tone?: "good" | "bad";
}) {
  const color = tone
    ? tone === "good"
      ? "var(--color-brass)"
      : "var(--color-signal)"
    : accent
      ? "var(--color-brass)"
      : "var(--color-ink)";

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-paper p-4">
      <span className="label">{k}</span>
      <span className="font-display text-xl tabular-nums break-words" style={{ color }}>
        {v}
      </span>
    </div>
  );
}
