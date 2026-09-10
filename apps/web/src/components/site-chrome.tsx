import Link from "next/link";
import { MARKETS, type Market } from "@lavion/schema";
import { ShortlistLink } from "./shortlist";
import { WhatsAppFab } from "./whatsapp-fab";
import type { ListingContext } from "@/lib/enquiry-topics";
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
function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

/**
 * Two rows below lg, one from lg.
 *
 * The single row overflowed every phone width — the action cluster alone
 * measured 338px inside a 375px viewport — and the market switcher was hidden
 * below md, so a phone visitor could not change market at all.
 *
 * Row two is sized to FIT at 360px rather than scroll: a horizontally
 * scrollable nav hides its last item, and the last item here is the listing
 * call to action. Search moves up to row one as an icon to make that room,
 * which is also where a phone user expects it — beside the other controls
 * rather than buried in a strip.
 */
export function SiteHeader({ market }: { market?: Market }) {
  const m = market ?? "uk";

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        {/* Row one: identity and the always-available controls. */}
        <div className="flex items-center gap-3 py-2.5 sm:gap-6 sm:py-4">
          <Link href={market ? `/${market}` : "/"} className="shrink-0">
            <span className="font-display text-lg tracking-tight sm:text-xl">{BRAND_NAME}</span>
            <span className="sr-only">— home</span>
          </Link>

          <nav aria-label="Markets" className="ml-1 hidden items-center gap-1 lg:flex">
            {MARKET_ORDER.map((x) => (
              <Link
                key={x}
                href={`/${x}`}
                aria-current={market === x ? "page" : undefined}
                className={`label px-3 py-2 transition-colors hover:text-ink ${
                  market === x ? "!text-brass" : ""
                }`}
              >
                {x.toUpperCase()}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {/* Icon-only below lg, labelled from lg where there is room. */}
            <Link
              href={`/${m}/search`}
              aria-label="Search properties"
              className="inline-flex h-[34px] w-[34px] items-center justify-center border border-line transition-colors hover:border-brass lg:hidden"
            >
              <SearchIcon />
            </Link>
            <Link
              href={`/${m}/search`}
              className="label hidden border border-line px-4 py-2 transition-colors hover:border-brass hover:text-ink lg:block"
            >
              Search
            </Link>

            <ShortlistLink market={market} />
            <ThemeToggle />

            <Link
              href={`/${m}/submit`}
              className="label hidden border border-brass/50 bg-brass-wash px-4 py-2 !text-brass transition-colors hover:border-brass lg:block"
            >
              List your property
            </Link>
          </div>
        </div>

        {/* Row two, below lg. Sized to fit 360px, so nothing is hidden. */}
        <div className="-mx-4 flex items-center gap-1.5 border-t border-line px-4 py-1.5 sm:-mx-6 sm:gap-2 sm:px-6 lg:hidden">
          <nav aria-label="Markets" className="flex items-center gap-1.5 sm:gap-2">
            {MARKET_ORDER.map((x) => (
              <Link
                key={x}
                href={`/${x}`}
                aria-current={market === x ? "page" : undefined}
                className={`label shrink-0 border px-2 py-2 transition-colors sm:px-3 ${
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
            href={`/${m}/submit`}
            className="label ml-auto shrink-0 truncate border border-brass/50 bg-brass-wash px-3 py-2 !text-brass transition-colors hover:border-brass"
          >
            List your property
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({
  market,
  /**
   * Passed only by the listing page. With it the enquiry picker offers
   * questions about THIS property ("is this still available?") instead of
   * generic ones, and appends the URL so the agent can open what is being
   * asked about.
   */
  listing,
}: {
  market?: Market;
  listing?: ListingContext;
}) {
  const active = market ?? "uk";
  return (
    <>
      {/*
        Mounted here rather than in the root layout on purpose: the layout also
        wraps /admin and /agency, and a public enquiry button has no business
        on a staff console. Every public page renders this footer.
      */}
      <WhatsAppFab market={active} listing={listing} />
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
    </>
  );
}
