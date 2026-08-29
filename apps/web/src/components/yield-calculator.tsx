"use client";

import { useMemo, useState } from "react";
import { MARKETS, type Market } from "@lavion/schema";

/**
 * Mortgage and rental-yield calculator.
 *
 * Runs entirely client-side on numbers the buyer controls — no request, no
 * stored assumption that can silently go stale. Defaults differ by market
 * because a 25% deposit is normal in Dubai and unusual in London, and a
 * calculator that opens on the wrong assumption teaches the wrong number.
 *
 * Gross yield only, and it says so: net yield needs service charge, agency
 * fees and void periods, which vary per property and are not ours to guess.
 */

interface Defaults {
  depositPct: number;
  ratePct: number;
  years: number;
  /** Typical gross annual rent as a fraction of value, for the yield seed. */
  grossYieldPct: number;
  note: string;
}

const DEFAULTS: Record<Market, Defaults> = {
  uk: {
    depositPct: 25,
    ratePct: 5.2,
    years: 25,
    grossYieldPct: 4.5,
    note: "Non-resident buyers are typically asked for a larger deposit than residents.",
  },
  ae: {
    depositPct: 25,
    ratePct: 4.5,
    years: 25,
    grossYieldPct: 6.5,
    note: "Non-resident mortgages in the UAE commonly require 25–35% down.",
  },
  pk: {
    depositPct: 30,
    ratePct: 16,
    years: 15,
    grossYieldPct: 5,
    note: "Financing rates in Pakistan track the policy rate and move sharply.",
  },
};

export function YieldCalculator({
  price,
  currency,
  market,
}: {
  price: number;
  currency: string;
  market: Market;
}) {
  const d = DEFAULTS[market];
  const [depositPct, setDepositPct] = useState(d.depositPct);
  const [ratePct, setRatePct] = useState(d.ratePct);
  const [years, setYears] = useState(d.years);
  const [monthlyRent, setMonthlyRent] = useState(
    Math.round((price * (d.grossYieldPct / 100)) / 12),
  );

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat(MARKETS[market].locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }),
    [market, currency],
  );

  const { deposit, loan, monthly, totalInterest, grossYield, netMonthly } = useMemo(() => {
    const deposit = Math.round(price * (depositPct / 100));
    const loan = Math.max(0, price - deposit);
    const r = ratePct / 100 / 12;
    const n = years * 12;

    // Standard amortisation; the r === 0 branch avoids a divide-by-zero when
    // someone drags the rate to zero.
    const monthly =
      r === 0 ? (n ? loan / n : 0) : (loan * r) / (1 - Math.pow(1 + r, -n));

    return {
      deposit,
      loan,
      monthly: Math.round(monthly),
      totalInterest: Math.round(monthly * n - loan),
      grossYield: price > 0 ? ((monthlyRent * 12) / price) * 100 : 0,
      netMonthly: Math.round(monthlyRent - monthly),
    };
  }, [price, depositPct, ratePct, years, monthlyRent]);

  return (
    <section className="mt-12 border border-line bg-surface p-7">
      <p className="label !text-brass">Run the numbers</p>
      <h2 className="mt-3 font-display text-2xl">Mortgage and yield</h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
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
          <Slider
            label="Term"
            value={years}
            min={5}
            max={35}
            step={1}
            suffix=" yrs"
            onChange={setYears}
          />

          <label className="flex flex-col gap-1.5">
            <span className="label">Expected monthly rent</span>
            <input
              type="number"
              value={monthlyRent}
              min={0}
              onChange={(e) => setMonthlyRent(Math.max(0, Number(e.target.value) || 0))}
              className="border border-line bg-paper px-3 py-2.5 text-sm tabular-nums outline-none focus-visible:border-brass"
            />
          </label>
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

      <p className="mt-6 border-t border-line pt-5 text-xs leading-relaxed text-ink-faint">
        {d.note} Gross yield only — it excludes service charge, agency fees,
        maintenance and void periods, which vary per property. An illustration
        for comparison, not a mortgage quote or financial advice.
      </p>
    </section>
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
    <div className="flex items-baseline justify-between gap-4 bg-paper p-4">
      <span className="label">{k}</span>
      <span className="font-display text-xl tabular-nums" style={{ color }}>
        {v}
      </span>
    </div>
  );
}
