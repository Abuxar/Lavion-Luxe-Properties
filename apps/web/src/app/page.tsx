import Link from "next/link";
import { MARKETS, type Market } from "@lavion/schema";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

const ORDER: Market[] = ["uk", "ae", "pk"];

const BLURB: Record<Market, string> = {
  uk: "Tenure, council tax and lease terms published up front.",
  ae: "Permit-verified listings, with Golden Visa eligibility computed.",
  pk: "Buy from abroad through an RDA, with guaranteed repatriation.",
};

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-[1400px] px-6 py-24 sm:py-36">
          <p className="label">Three markets, one standard</p>
          <h1 className="mt-6 max-w-[16ch] font-display text-[clamp(2.8rem,8vw,6.5rem)] leading-[0.95] tracking-[-0.02em]">
            Property, with the rules made plain.
          </h1>
          <div className="rule-brass mt-10 w-48" />
          <p className="mt-8 max-w-[56ch] text-lg leading-relaxed text-ink-soft">
            Lavion Luxe lists luxury property across the United Kingdom, the
            United Arab Emirates and Pakistan &mdash; and tells you who may buy,
            on what tenure, and what it means for residency before you enquire.
          </p>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto grid max-w-[1400px] gap-px bg-line px-6 sm:grid-cols-3 sm:px-0">
            {ORDER.map((m) => (
              <Link
                key={m}
                href={`/${m}`}
                className="group flex flex-col justify-between gap-10 bg-paper p-10 transition-colors hover:bg-surface"
              >
                <div>
                  <p className="label !text-brass">{m.toUpperCase()}</p>
                  <h2 className="mt-4 font-display text-3xl">{MARKETS[m].label}</h2>
                  <p className="mt-4 max-w-[30ch] text-sm leading-relaxed text-ink-soft">
                    {BLURB[m]}
                  </p>
                </div>
                <span className="label inline-flex items-center gap-2 group-hover:text-brass">
                  Enter
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    &rarr;
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
