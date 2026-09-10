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

export function LazyYieldCalculator(props: {
  price: number;
  currency: string;
  market: Market;
}) {
  return (
    <DeferUntilVisible minHeight={520}>
      <YieldCalculator {...props} />
    </DeferUntilVisible>
  );
}
