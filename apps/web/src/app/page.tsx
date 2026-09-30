import Image from "next/image";
import Link from "next/link";
import { MARKETS, type Market } from "@lavion/schema";
import { MarketTriptych } from "@/components/market-triptych";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { BRAND_NAME } from "@/lib/brand";

const ORDER: Market[] = ["uk", "ae", "pk"];

const BLURB: Record<Market, string> = {
  uk: "Tenure, council tax and lease terms published up front.",
  ae: "Permit-verified listings, with Golden Visa eligibility computed.",
  pk: "Buy from abroad through an RDA, with guaranteed repatriation.",
};

/** Same photographs as the market heroes, shown sharp because here they are
 *  the content rather than a backdrop for type. */
const CARD: Record<Market, { src: string; alt: string; focal: string }> = {
  uk: {
    src: "/hero/uk.webp",
    alt: "The Palace of Westminster and Big Ben in fog above the Thames",
    focal: "58% 50%",
  },
  ae: {
    src: "/hero/ae.webp",
    alt: "The Dubai skyline rising above low cloud at sunrise",
    focal: "55% 50%",
  },
  pk: {
    src: "/hero/pk.webp",
    alt: "The Pakistan Monument in Islamabad lit at dusk",
    focal: "52% 45%",
  },
};

/** The differentiator, in the three forms it actually takes on the listings. */
const POINTS: { k: string; v: string }[] = [
  {
    k: "Permit-verified",
    v: "Every Dubai listing carries a live DLD advertising permit number. Lapsed permits are withdrawn automatically.",
  },
  {
    k: "Material Information",
    v: "UK listings publish Parts A and B up front — tenure, council tax, lease years, service charge.",
  },
  {
    k: "Eligibility computed",
    v: "Golden Visa qualification and freehold status are derived from the listing, not claimed in the copy.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/*
          Deliberately short of the full viewport. The page's one job is to send
          someone into a market, so the top of that choice has to be visible
          without scrolling — a full-height hero hid it behind a scroll and left
          the landing page looking like it had nothing on it.
        */}
        <section className="relative flex min-h-[72svh] flex-col justify-center overflow-hidden border-b border-line">
          <MarketTriptych />

          <div className="relative mx-auto w-full max-w-[1400px] px-6 py-20 text-[#f1efe9]">
            <div className="max-w-4xl">
              {/* .label pins itself to --color-ink-faint, which is dark in the
                  light theme. This sits on photography, so it opts out. */}
              <p className="label !text-[#c7cfcb]">Three markets, one standard</p>
              <h1 className="mt-6 max-w-[16ch] font-display text-[clamp(2.6rem,7vw,5.8rem)] leading-[0.95] tracking-[-0.02em]">
                Property, with the rules made plain.
              </h1>
              <div className="rule-brass-on-dark mt-8 w-40" />
              <p className="mt-8 max-w-[56ch] text-lg leading-relaxed text-[#c7cfcb]">
                {BRAND_NAME} lists luxury property across the United Kingdom, the
                United Arab Emirates and Pakistan &mdash; and tells you who may
                buy, on what tenure, and what it means for residency before you
                enquire.
              </p>
            </div>
          </div>
        </section>

        {/* ---------- the choice ---------- */}
        <section className="mx-auto max-w-[1400px] px-6 py-16 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
            <div>
              <p className="label">Choose a market</p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl">
                Where are you buying?
              </h2>
            </div>
            <Link href="/uk/submit" className="label hover:text-brass">
              List your property &rarr;
            </Link>
          </div>

          <div data-reveal-group className="mt-10 grid gap-6 sm:grid-cols-3">
            {ORDER.map((m) => (
              <Link
                key={m}
                href={`/${m}`}
                data-reveal
                aria-label={`Enter ${MARKETS[m].label}`}
                className="group relative flex aspect-[3/2] flex-col justify-end overflow-hidden border border-line transition-[border-color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-brass hover:shadow-[0_14px_32px_-20px_rgba(0,0,0,0.55)] motion-reduce:hover:translate-y-0 sm:aspect-[4/5]"
              >
                <Image
                  src={CARD[m].src}
                  alt={CARD[m].alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  quality={75}
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05] motion-reduce:group-hover:scale-100"
                  style={{ objectPosition: CARD[m].focal }}
                />

                {/* Dark in both themes: the type below sits on a photograph. */}
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(11,20,22,0.10) 0%, rgba(11,20,22,0.40) 42%, rgba(11,20,22,0.90) 100%)",
                  }}
                />

                <div className="relative p-7 text-[#f1efe9] sm:p-8">
                  {/* The card is dark in both themes, so brass comes from the dark
                      palette rather than the token — see .text-brass-on-dark. */}
                  <p className="label text-brass-on-dark">{m.toUpperCase()}</p>
                  <h3 className="mt-3 font-display text-3xl leading-tight">
                    {MARKETS[m].label}
                  </h3>
                  <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-[#c7cfcb]">
                    {BLURB[m]}
                  </p>
                  <span className="label mt-6 inline-flex items-center gap-2 !text-[#f1efe9] transition-colors group-hover:!text-[#c9a15c]">
                    Enter
                    <span aria-hidden className="transition-transform group-hover:translate-x-1">
                      &rarr;
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ---------- why it is worth entering ---------- */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-[1400px] px-6 py-16 sm:py-20">
            <p className="label">Why {BRAND_NAME}</p>
            <h2 className="mt-3 max-w-[22ch] font-display text-3xl sm:text-4xl">
              The rules, before the enquiry.
            </h2>

            <ul className="mt-10 grid gap-px bg-line sm:grid-cols-3">
              {POINTS.map((p) => (
                <li key={p.k} className="bg-surface p-7 sm:p-8">
                  <p className="label !text-brass">{p.k}</p>
                  <p className="mt-3 max-w-[38ch] text-sm leading-relaxed text-ink-soft">
                    {p.v}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
