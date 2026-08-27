import { notFound } from "next/navigation";
import { MARKETS, type Market } from "@lavion/schema";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { SubmitForm } from "./submit-form";

const VALID: Market[] = ["uk", "ae", "pk"];

export function generateStaticParams() {
  return VALID.map((market) => ({ market }));
}

export async function generateMetadata({ params }: PageProps<"/[market]/submit">) {
  const { market } = await params;
  const label = MARKETS[market as Market]?.label ?? "";
  return {
    title: `List your property in ${label}`,
    description: `Submit a property for sale or rent in ${label}. Every listing is reviewed against local disclosure rules before it goes live.`,
    alternates: { canonical: `/${market}/submit` },
  };
}

// No motion provider: this is a form, judged on responsiveness.
export default async function SubmitPage({ params }: PageProps<"/[market]/submit">) {
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
            <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.2rem)] leading-tight">
              List your property
            </h1>
            <div className="rule-brass mt-6 w-28" />
            <p className="mt-6 max-w-[58ch] leading-relaxed text-ink-soft">
              Tell us about the property and we will check it against the
              disclosure rules for {MARKETS[m].label} before it appears. We will
              tell you straight away if anything is missing.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-[900px] px-6 py-12">
          <SubmitForm market={m} />
        </div>
      </main>
      <SiteFooter market={m} />
    </>
  );
}
