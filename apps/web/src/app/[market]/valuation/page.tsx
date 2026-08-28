import { notFound } from "next/navigation";
import { MARKETS, type Market } from "@lavion/schema";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ValuationForm } from "./valuation-form";

const VALID: Market[] = ["uk", "ae", "pk"];

export function generateStaticParams() {
  return VALID.map((market) => ({ market }));
}

export async function generateMetadata({ params }: PageProps<"/[market]/valuation">) {
  const { market } = await params;
  const label = MARKETS[market as Market]?.label ?? "";
  return {
    title: `What is your property worth in ${label}?`,
    description: `Get an indicative range from comparable listings in your area, and a full appraisal from the specialist who covers it.`,
    alternates: { canonical: `/${market}/valuation` },
  };
}

export default async function ValuationPage({ params }: PageProps<"/[market]/valuation">) {
  const { market } = await params;
  if (!VALID.includes(market as Market)) notFound();
  const m = market as Market;

  return (
    <>
      <SiteHeader market={m} />
      <main className="flex-1">
        <div className="border-b border-line bg-surface">
          <div className="mx-auto max-w-[900px] px-6 py-14">
            <p className="label">{MARKETS[m].label}</p>
            <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.4rem)] leading-tight">
              What is your property worth?
            </h1>
            <div className="rule-brass mt-6 w-28" />
            <p className="mt-6 max-w-[58ch] leading-relaxed text-ink-soft">
              Tell us about the property and we will show you an indicative range
              from comparable listings straight away — then the specialist who
              covers your area will follow up with a full appraisal.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-[900px] px-6 py-12">
          <ValuationForm market={m} />
        </div>
      </main>
      <SiteFooter market={m} />
    </>
  );
}
