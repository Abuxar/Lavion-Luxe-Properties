import Link from "next/link";
import { MARKETS, type Market } from "@lavion/schema";

// Resolved at build, not render: reading the clock during prerender would
// make every page that includes the footer dynamic.
const YEAR = new Date().getFullYear();

const MARKET_ORDER: Market[] = ["uk", "ae", "pk"];

export function SiteHeader({ market }: { market?: Market }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-4">
        <Link href={market ? `/${market}` : "/"} className="shrink-0">
          <span className="font-display text-xl tracking-tight">Lavion Luxe</span>
          <span className="sr-only">Properties — home</span>
        </Link>

        <nav aria-label="Markets" className="ml-2 hidden items-center gap-1 md:flex">
          {MARKET_ORDER.map((m) => (
            <Link
              key={m}
              href={`/${m}`}
              aria-current={market === m ? "page" : undefined}
              className={`label px-3 py-2 transition-colors hover:text-ink ${
                market === m ? "!text-brass" : ""
              }`}
            >
              {m.toUpperCase()}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {market && (
            <Link
              href={`/${market}/search`}
              className="label border border-line px-4 py-2 transition-colors hover:border-brass hover:text-ink"
            >
              Search
            </Link>
          )}
          <Link
            href={`/${market ?? "uk"}/submit`}
            className="label border border-brass/50 bg-brass-wash px-4 py-2 !text-brass transition-colors hover:border-brass"
          >
            List your property
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ market }: { market?: Market }) {
  const active = market ?? "uk";
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto max-w-[1400px] px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-2xl">Lavion Luxe</p>
            <div className="rule-brass mt-4 w-24" />
            <p className="mt-4 max-w-[34ch] text-sm text-ink-soft">
              Luxury property across three markets, with the ownership and
              residency rules made explicit before you enquire.
            </p>
          </div>

          <div>
            <p className="label">Markets</p>
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {MARKET_ORDER.map((m) => (
                <li key={m}>
                  <Link href={`/${m}`} className="text-ink-soft hover:text-brass">
                    {MARKETS[m].label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="label">Investors</p>
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              <li>
                <Link href={`/${active}/guides`} className="text-ink-soft hover:text-brass">
                  Cross-border guides
                </Link>
              </li>
              <li>
                <Link href="/ae/search?goldenVisaEligible=true" className="text-ink-soft hover:text-brass">
                  Golden Visa eligible
                </Link>
              </li>
              <li>
                <Link href={`/${active}/submit`} className="text-ink-soft hover:text-brass">
                  List your property
                </Link>
              </li>
              <li>
                <Link href={`/${active}/valuation`} className="text-ink-soft hover:text-brass">
                  Request a valuation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="label">Compliance</p>
            <p className="mt-4 max-w-[34ch] text-xs leading-relaxed text-ink-faint">
              Dubai listings carry a DLD advertising permit number. UK listings
              carry Material Information as required by National Trading
              Standards. Guidance on this site is general information, not
              legal, tax or financial advice.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="label">&copy; {YEAR} Lavion Luxe Properties</p>
          <p className="label">United Kingdom · United Arab Emirates · Pakistan</p>
        </div>
      </div>
    </footer>
  );
}
