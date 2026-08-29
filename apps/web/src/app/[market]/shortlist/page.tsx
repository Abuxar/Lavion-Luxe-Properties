import { notFound } from "next/navigation";
import { MARKETS, type Market } from "@lavion/schema";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ShortlistView } from "./shortlist-view";

const VALID: Market[] = ["uk", "ae", "pk"];

export function generateStaticParams() {
  return VALID.map((market) => ({ market }));
}

export async function generateMetadata({ params }: PageProps<"/[market]/shortlist">) {
  const { market } = await params;
  return {
    title: "Saved properties",
    description: `Compare the properties you have saved across ${MARKETS[market as Market]?.label ?? ""}.`,
    // Personal to one browser, so there is nothing here worth indexing.
    robots: { index: false, follow: true },
  };
}

export default async function ShortlistPage({ params }: PageProps<"/[market]/shortlist">) {
  const { market } = await params;
  if (!VALID.includes(market as Market)) notFound();
  const m = market as Market;

  return (
    <>
      <SiteHeader market={m} />
      <main className="flex-1">
        <div className="border-b border-line bg-surface">
          <div className="mx-auto max-w-[1400px] px-6 py-12">
            <p className="label">{MARKETS[m].label}</p>
            <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.4rem)] leading-tight">
              Saved properties
            </h1>
            <div className="rule-brass mt-6 w-28" />
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-6 py-10">
          <ShortlistView market={m} />
        </div>
      </main>
      <SiteFooter market={m} />
    </>
  );
}
