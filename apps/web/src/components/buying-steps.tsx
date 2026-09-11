import type { Market } from "@lavion/schema";
import { BUYING } from "@/lib/buying-process";

/**
 * The purchase process for this market, above the numbers.
 *
 * A server component on purpose: it is plain explanatory text, so it belongs
 * in the prerendered HTML — readable without JavaScript and indexable for the
 * "how to buy property in Pakistan" kind of query — while only the calculator
 * below it is deferred to the client.
 */
export function BuyingSteps({ market, offPlan }: { market: Market; offPlan?: boolean }) {
  const b = BUYING[market];

  return (
    <section className="mt-12" aria-labelledby="buying-steps-title">
      <p className="label">How buying works</p>
      <h2 id="buying-steps-title" className="mt-3 font-display text-2xl">
        {b.title}
      </h2>
      <p className="mt-3 max-w-[65ch] leading-relaxed text-ink-soft">{b.summary}</p>

      <ol className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2">
        {b.steps.map((s, i) => (
          <li key={s.title} className="bg-paper p-5">
            <p className="label !text-brass tnum">Step {i + 1}</p>
            <p className="mt-2 font-medium text-ink">{s.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.body}</p>
          </li>
        ))}
      </ol>

      {offPlan && (
        <p className="mt-4 border-l-2 border-brass pl-4 text-sm leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">This is off-plan. </span>
          {b.offPlan}
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-ink-faint">{b.note}</p>
    </section>
  );
}
