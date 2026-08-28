import Link from "next/link";
import { notFound } from "next/navigation";
import { MARKETS, type Market } from "@lavion/schema";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { LegalDisclaimer } from "@/components/legal-disclaimer";
import { listGuides } from "@/lib/guides";

const VALID: Market[] = ["uk", "ae", "pk"];

export function generateStaticParams() {
  return VALID.map((market) => ({ market }));
}

export async function generateMetadata({ params }: PageProps<"/[market]/guides">) {
  const { market } = await params;
  const label = MARKETS[market as Market]?.label ?? "";
  return {
    title: `Investor guides — ${label}`,
    description: `Ownership rules, residency routes and tax treatment for buying property in ${label}. Each rule cites its source and the date it was last reviewed.`,
    alternates: {
      canonical: `/${market}/guides`,
      languages: Object.fromEntries([
        ...VALID.map((m) => [MARKETS[m].locale, `/${m}/guides`]),
        ["x-default", "/"],
      ]),
    },
  };
}

export default async function GuidesIndex({ params }: PageProps<"/[market]/guides">) {
  const { market } = await params;
  if (!VALID.includes(market as Market)) notFound();
  const m = market as Market;
  const guides = await listGuides(m);

  return (
    <>
      <SiteHeader market={m} />
      <main className="flex-1">
        <div className="border-b border-line bg-surface">
          <div className="mx-auto max-w-[1000px] px-6 py-14">
            <p className="label">{MARKETS[m].label}</p>
            <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.4rem)] leading-tight">
              Investor guides
            </h1>
            <div className="rule-brass mt-6 w-28" />
            <p className="mt-6 max-w-[60ch] leading-relaxed text-ink-soft">
              Who may own what, which purchases open a residency route, and how
              the money comes back out. Every rule below cites the authority it
              came from and the date we last checked it.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-[1000px] px-6 py-12">
          <ul className="flex flex-col gap-px bg-line">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/${m}/guides/${g.slug}`}
                  className="group block bg-paper p-7 transition-colors hover:bg-surface"
                >
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h2 className="font-display text-2xl group-hover:text-brass">{g.title}</h2>
                    <span className="label">{g.rules.length} rules</span>
                  </div>
                  <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-soft">
                    {g.standfirst}
                  </p>
                  <p className="label mt-4">
                    For {g.audience} · Reviewed {g.lastReviewedAt.toISOString().slice(0, 10)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <LegalDisclaimer market={m} />
        </div>
      </main>
      <SiteFooter market={m} />
    </>
  );
}
