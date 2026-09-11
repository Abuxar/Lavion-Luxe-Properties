"use client";

import { useMemo, useState } from "react";
import { MARKETS, type Market } from "@lavion/schema";

/**
 * The numbers panel, shaped by how property is actually bought in each market.
 *
 * It used to run one mortgage model everywhere. In Pakistan that described a
 * transaction nobody makes: a purchase there is a token paid to the seller and
 * the balance in full on a fixed date, with no loan and no interest, so
 * "monthly repayment" and "total interest over term" were simply wrong. The UK
 * and UAE do buy with mortgages, but the money moves at legal milestones —
 * exchange and completion, the MOU deposit and transfer — and those are what a
 * buyer actually has to plan cash around, so they are shown too.
 *
 * Runs entirely client-side on numbers the buyer controls — no request, no
 * stored assumption that can silently go stale. Gross yield only, and it says
 * so: net yield needs service charge, fees and void periods, which vary per
 * property and are not ours to guess.
 */

interface MortgageTerms {
  mode: "mortgage";
  heading: string;
  depositPct: number;
  ratePct: number;
  years: number;
  /** Typical gross annual rent as a fraction of value, for the yield seed. */
  grossYieldPct: number;
  /** The first payment, at the milestone that makes the deal binding. */
  first: { label: string; pct: number; note: string };
  /** Everything else, at the milestone that transfers ownership. */
  second: { label: string; note: string };
  note: string;
}

interface TokenTerms {
  mode: "token";
  heading: string;
  tokenPct: number;
  balanceDays: number;
  grossYieldPct: number;
  note: string;
}

const TERMS: Record<Market, MortgageTerms | TokenTerms> = {
  uk: {
    mode: "mortgage",
    heading: "Deposit, mortgage and yield",
    depositPct: 25,
    ratePct: 5.2,
    years: 25,
    grossYieldPct: 4.5,
    first: {
      label: "At exchange of contracts",
      pct: 10,
      note: "Paid through your solicitor. The deal is now binding.",
    },
    second: {
      label: "At completion",
      note: "The rest of your deposit plus the mortgage, sent by your solicitor.",
    },
    note: "Non-resident buyers are typically asked for a larger deposit than residents.",
  },
  ae: {
    mode: "mortgage",
    heading: "Deposit, mortgage and yield",
    depositPct: 25,
    ratePct: 4.5,
    years: 25,
    grossYieldPct: 6.5,
    first: {
      label: "On signing the MOU",
      pct: 10,
      note: "Security deposit, usually a cheque held until transfer.",
    },
    second: {
      label: "At transfer",
      note: "The balance, from your own funds or a UAE mortgage.",
    },
    note: "Non-resident mortgages in the UAE commonly require 25–35% down.",
  },
  pk: {
    mode: "token",
    heading: "Token, balance and yield",
    tokenPct: 10,
    balanceDays: 45,
    grossYieldPct: 5,
    note: "No loan and no interest — the agreed price is the price paid. Transfer fees and advance taxes are extra, and advance tax depends on filer status.",
  },
};

type Fmt = Intl.NumberFormat;

export function YieldCalculator({
  price,
  currency,
  market,
}: {
  price: number;
  currency: string;
  market: Market;
}) {
  const t = TERMS[market];
  const locale = MARKETS[market].locale;

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }),
    [locale, currency],
  );

  return (
    // No top margin here: it would collapse through the deferral wrapper and
    // only appear once this mounts. The wrapper carries it instead.
    <section className="border border-line bg-surface p-7">
      <p className="label !text-brass">Run the numbers</p>
      <h2 className="mt-3 font-display text-2xl">{t.heading}</h2>

      {t.mode === "token" ? (
        <TokenPlan terms={t} price={price} fmt={fmt} locale={locale} />
      ) : (
        <MortgagePlan terms={t} price={price} fmt={fmt} />
      )}
    </section>
  );
}

/* ---------- Pakistan: token now, balance on a fixed date, no interest ---------- */

function TokenPlan({
  terms,
  price,
  fmt,
  locale,
}: {
  terms: TokenTerms;
  price: number;
  fmt: Fmt;
  locale: string;
}) {
  const [tokenPct, setTokenPct] = useState(terms.tokenPct);
  const [days, setDays] = useState(terms.balanceDays);
  const [monthlyRent, setMonthlyRent] = useState(
    Math.round((price * (terms.grossYieldPct / 100)) / 12),
  );

  const token = Math.round(price * (tokenPct / 100));
  const balance = Math.max(0, price - token);
  const grossYield = price > 0 ? ((monthlyRent * 12) / price) * 100 : 0;

  // Reading today's date is safe here: this component is loaded with
  // ssr:false, so there is no server render for it to disagree with.
  const dueLabel = useMemo(() => {
    const due = new Date();
    due.setDate(due.getDate() + days);
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(due);
  }, [days, locale]);

  return (
    <>
      <div className="mt-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <div className="flex flex-col gap-5">
          <Slider
            label="Token to the seller"
            value={tokenPct}
            min={5}
            max={50}
            step={1}
            suffix="%"
            hint={fmt.format(token)}
            onChange={setTokenPct}
          />
          <Slider
            label="Balance due in"
            value={days}
            min={7}
            max={180}
            step={1}
            suffix=" days"
            onChange={setDays}
          />
          <RentInput value={monthlyRent} onChange={setMonthlyRent} />
        </div>

        <div className="flex flex-col gap-px bg-line">
          <Figure k="Token now" v={fmt.format(token)} accent />
          <Figure k={`Balance by ${dueLabel}`} v={fmt.format(balance)} />
          <Figure k="Interest" v="None" />
          <Figure k="Total paid" v={fmt.format(price)} />
          <Figure k="Gross rental yield" v={`${grossYield.toFixed(2)}%`} accent />
        </div>
      </div>

      <Footnote>
        {terms.note} Gross yield only — it excludes maintenance, fees and void
        periods. An illustration for comparison, not a quote or financial advice.
      </Footnote>
    </>
  );
}

/* ---------- UK and UAE: deposit at a binding milestone, balance at transfer ---------- */

function MortgagePlan({
  terms,
  price,
  fmt,
}: {
  terms: MortgageTerms;
  price: number;
  fmt: Fmt;
}) {
  const [depositPct, setDepositPct] = useState(terms.depositPct);
  const [ratePct, setRatePct] = useState(terms.ratePct);
  const [years, setYears] = useState(terms.years);
  const [monthlyRent, setMonthlyRent] = useState(
    Math.round((price * (terms.grossYieldPct / 100)) / 12),
  );

  const { deposit, loan, monthly, totalInterest, grossYield, netMonthly } = useMemo(() => {
    const deposit = Math.round(price * (depositPct / 100));
    const loan = Math.max(0, price - deposit);
    const r = ratePct / 100 / 12;
    const n = years * 12;

    // Standard amortisation; the r === 0 branch avoids a divide-by-zero when
    // someone drags the rate to zero.
    const monthly = r === 0 ? (n ? loan / n : 0) : (loan * r) / (1 - Math.pow(1 + r, -n));

    return {
      deposit,
      loan,
      monthly: Math.round(monthly),
      totalInterest: Math.round(monthly * n - loan),
      grossYield: price > 0 ? ((monthlyRent * 12) / price) * 100 : 0,
      netMonthly: Math.round(monthlyRent - monthly),
    };
  }, [price, depositPct, ratePct, years, monthlyRent]);

  // The first payment comes out of your own money, so it can never be more
  // than the deposit you have — a 5% deposit cannot fund a 10% exchange.
  const firstPct = Math.min(terms.first.pct, depositPct);
  const first = Math.round(price * (firstPct / 100));

  return (
    <>
      <div className="mt-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <div className="flex flex-col gap-5">
          <Slider
            label="Deposit"
            value={depositPct}
            min={5}
            max={100}
            step={1}
            suffix="%"
            hint={fmt.format(deposit)}
            onChange={setDepositPct}
          />
          <Slider
            label="Interest rate"
            value={ratePct}
            min={0}
            max={25}
            step={0.1}
            suffix="%"
            onChange={setRatePct}
          />
          <Slider label="Term" value={years} min={5} max={35} step={1} suffix=" yrs" onChange={setYears} />
          <RentInput value={monthlyRent} onChange={setMonthlyRent} />
        </div>

        <div className="flex flex-col gap-px bg-line">
          <Figure k="Monthly repayment" v={fmt.format(monthly)} accent />
          <Figure k="Loan amount" v={fmt.format(loan)} />
          <Figure k="Total interest over term" v={fmt.format(totalInterest)} />
          <Figure k="Gross rental yield" v={`${grossYield.toFixed(2)}%`} accent />
          <Figure
            k="Rent minus repayment"
            v={`${netMonthly >= 0 ? "+" : ""}${fmt.format(netMonthly)}`}
            tone={netMonthly >= 0 ? "good" : "bad"}
          />
        </div>
      </div>

      <p className="label mt-8">When the money moves</p>
      <div className="mt-3 grid gap-px border border-line bg-line sm:grid-cols-2">
        <Stage label={terms.first.label} pct={firstPct} value={fmt.format(first)} note={terms.first.note} />
        <Stage
          label={terms.second.label}
          pct={100 - firstPct}
          value={fmt.format(price - first)}
          note={terms.second.note}
        />
      </div>

      <Footnote>
        {terms.note} Gross yield only — it excludes service charge, agency fees,
        maintenance and void periods, which vary per property. An illustration
        for comparison, not a mortgage quote or financial advice.
      </Footnote>
    </>
  );
}

/* ---------- primitives ---------- */

function Stage({ label, pct, value, note }: { label: string; pct: number; value: string; note: string }) {
  return (
    <div className="bg-paper p-4">
      <p className="label">
        {label} · <span className="tnum">{pct}%</span>
      </p>
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
