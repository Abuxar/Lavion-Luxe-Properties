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
 * Measured, not estimated, at 390 / 768 / 1024 / 1366px: the panel differs by
 * market (the UAE plan carries a mortgage and three payment tiles, the UK plan
 * Stamp Duty options, Pakistan's bayana plan neither) and reflows from two
 * columns to one below lg. The UAE figures are for a Dubai listing. A single 520px reservation
 * shifted the page by 0.34–0.48 CLS on a tablet when the panel arrived.
 * Re-measure if the panel's content changes.
 *
 * Literal class strings so Tailwind can see them.
 */
const RESERVE: Record<Market, string> = {
  pk: "min-h-[906px] sm:min-h-[743px] lg:min-h-[668px] xl:min-h-[571px]",
  uk: "min-h-[1028px] sm:min-h-[859px] lg:min-h-[689px] xl:min-h-[571px]",
  ae: "min-h-[1493px] sm:min-h-[1044px] lg:min-h-[926px] xl:min-h-[761px]",
};

export function LazyYieldCalculator(props: {
  price: number;
  currency: string;
  market: Market;
  region?: string;
}) {
  return (
    <DeferUntilVisible className="mt-12" reserveClassName={RESERVE[props.market]}>
      <YieldCalculator {...props} />
    </DeferUntilVisible>
  );
}
