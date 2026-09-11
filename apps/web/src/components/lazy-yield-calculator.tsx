"use client";

import dynamic from "next/dynamic";
import type { Market } from "@lavion/schema";
import { DeferUntilVisible } from "./defer-until-visible";

/**
 * The calculator is a pure client widget below the fold, so it neither needs
 * server rendering nor a place in the initial bundle. Splitting it out and
 * gating it on visibility was worth ~200ms of Total Blocking Time on the
 * listing page, which was the slowest route in the audit.
 */
const YieldCalculator = dynamic(
  () => import("./yield-calculator").then((m) => m.YieldCalculator),
  { ssr: false },
);

/**
 * Space held for the panel before it mounts, per market and breakpoint.
 *
 * Measured, not estimated: the panel differs by market (Pakistan's token plan
 * is shorter than the UK and UAE mortgage plans with their payment milestones)
 * and reflows from two columns to one below lg. A single 520px reservation
 * shifted the page by 0.34–0.48 CLS on a tablet when the panel arrived.
 * Re-measure if the panel's content changes.
 *
 * Literal class strings so Tailwind can see them.
 */
const RESERVE: Record<Market, string> = {
  pk: "min-h-[822px] sm:min-h-[743px] lg:min-h-[612px] xl:min-h-[571px]",
  uk: "min-h-[1224px] sm:min-h-[985px] lg:min-h-[839px] xl:min-h-[721px]",
  ae: "min-h-[1265px] sm:min-h-[965px] lg:min-h-[843px] xl:min-h-[722px]",
};

export function LazyYieldCalculator(props: {
  price: number;
  currency: string;
  market: Market;
}) {
  return (
    <DeferUntilVisible className="mt-12" reserveClassName={RESERVE[props.market]}>
      <YieldCalculator {...props} />
    </DeferUntilVisible>
  );
}
