import Link from "next/link";
import { MARKETS, type Market } from "@lavion/schema";
import { ShortlistLink } from "./shortlist";
import { ThemeToggle } from "./theme-toggle";
import { BRAND_FULL_NAME, BRAND_NAME } from "@/lib/brand";

// Resolved at build, not render: reading the clock during prerender would
// make every page that includes the footer dynamic.
const YEAR = new Date().getFullYear();

const MARKET_ORDER: Market[] = ["uk", "ae", "pk"];

/**
 * Two rows on small screens, one on large.
 *
 * The single row overflowed every mobile viewport — the action cluster alone
 * measured 338px inside a 375px screen — and the market switcher was hidden
 * below md, so a phone visitor could not change market at all. Splitting the
 * actions onto a second row fixes both without a hamburger, which for four
 * destinations would hide navigation behind a tap for no gain.
 */
export function SiteHeader({ market }: { market?: Market }) {
  const m = market ?? "uk";

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        {/* Row one: identity, and the two controls worth reaching for first. */}
        <div className="flex items-center gap-4 py-2.5 sm:gap-6 sm:py-4">
          <Link href={market ? `/${market}` : "/"} className="shrink-0">
            <span className="font-display text-lg tracking-tight sm:text-xl">{BRAND_NAME}</span>
            <span className="sr-only">— home</span>
          </Link>

          {/* Markets sit inline from sm up; below that they move to row two. */}
          <nav aria-label="Markets" className="ml-1 hidden items-center gap-1 sm:flex">
            {MARKET_ORDER.map((x) => (
              <Link
                key={x}
                href={`/${x}`}
                aria-current={market === x ? "page" : undefined}
                className={`label px-2.5 py-2 transition-colors hover:text-ink lg:px-3 ${
                  market === x ? "!text-brass" : ""
                }`}
              >
                {x.toUpperCase()}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ShortlistLink market={market} />
            <ThemeToggle />

            {/* Full-width actions belong on row two on a phone. */}
            <Link
              href={`/${m}/search`}
              className="label hidden border border-line px-4 py-2 transition-colors hover:border-brass hover:text-ink lg:block"
            >
              Search
            </Link>
            <Link
              href={`/${m}/submit`}
              className="label hidden border border-brass/50 bg-brass-wash px-4 py-2 !text-brass transition-colors hover:border-brass lg:block"
            >
              List your property
            </Link>
          </div>
        </div>

        {/* Row two, below lg. Scrolls rather than wrapping, so the header keeps
            a predictable height and never reflows the sticky offset. */}
        <div className="-mx-4 flex items-center gap-2 overflow-x-auto border-t border-line px-4 py-1.5 sm:-mx-6 sm:px-6 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <nav aria-label="Markets" className="flex items-center gap-1 sm:hidden">
            {MARKET_ORDER.map((x) => (
              <Link
                key={x}
                href={`/${x}`}
                aria-current={market === x ? "page" : undefined}
                className={`label shrink-0 border px-3 py-2 transition-colors ${
                  market === x
                    ? "border-brass/50 bg-brass-wash !text-brass"
                    : "border-line hover:border-brass"
                }`}
              >
                {x.toUpperCase()}
              </Link>
            ))}
          </nav>

          <Link
            href={`/${m}/search`}
            className="label shrink-0 border border-line px-3 py-2 transition-colors hover:border-brass"
          >
            Search
          </Link>
          <Link
            href={`/${m}/guides`}
            className="label shrink-0 border border-line px-3 py-2 transition-colors hover:border-brass"
          >
            Guides
          </Link>
          <Link
            href={`/${m}/submit`}
            className="label shrink-0 border border-brass/50 bg-brass-wash px-3 py-2 !text-brass transition-colors hover:border-brass"
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
            <p className="font-display text-2xl">{BRAND_NAME}</p>
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
          <p className="label">&copy; {YEAR} {BRAND_FULL_NAME}</p>
          <p className="label">United Kingdom · United Arab Emirates · Pakistan</p>
        </div>
      </div>
    </footer>
  );
}
