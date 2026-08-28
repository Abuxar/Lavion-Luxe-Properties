import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MARKETS, type Market } from "@lavion/schema";
import { ListingCard } from "@/components/listing-card";
import { SaveSearch } from "@/components/save-search";
import { SearchFilters } from "@/components/search-filters";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getListings } from "@/lib/listings";
import {
  describeQuery,
  facetsFor,
  isFiltered,
  parseQuery,
  runSearch,
  toSearchParams,
} from "@/lib/search";

const VALID: Market[] = ["uk", "ae", "pk"];

export function generateStaticParams() {
  return VALID.map((market) => ({ market }));
}

export async function generateMetadata({ params }: PageProps<"/[market]/search">) {
  const { market } = await params;
  const label = MARKETS[market as Market]?.label ?? "";
  return {
    title: `Property for sale in ${label}`,
    description: `Search luxury property for sale and rent across ${label}.`,
    // Every filter combination canonicalises to the unfiltered page. Faceted
    // URLs are infinite; letting them into the index is how a portal's crawl
    // budget gets eaten by near-duplicate pages.
    alternates: { canonical: `/${market}/search` },
    robots: { index: true, follow: true },
  };
}

/**
 * No motion provider on this route. Search results are judged on INP and LCP,
 * so GSAP and Lenis are never downloaded here.
 */
export default async function SearchPage({
  params,
  searchParams,
}: PageProps<"/[market]/search">) {
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
              Find a property
            </h1>
          </div>
        </div>

        <div className="mx-auto max-w-[1400px] px-6 py-10">
          {/* searchParams is a runtime API, so results stream while the shell
              above is prerendered. */}
          <Suspense fallback={<Skeleton />}>
            <Results market={m} searchParams={searchParams} />
          </Suspense>
        </div>
      </main>

      <SiteFooter market={m} />
    </>
  );
}

async function Results({
  market,
  searchParams,
}: {
  market: Market;
  searchParams: PageProps<"/[market]/search">["searchParams"];
}) {
  const sp = await searchParams;
  const query = parseQuery(sp);

  const all = await getListings(market);
  const facets = facetsFor(all);
  const { items, total, pages, page } = runSearch(all, query);
  const filtered = isFiltered(query);

  const pageHref = (n: number) => {
    const qs = toSearchParams({ ...query, page: n });
    return qs ? `/${market}/search?${qs}` : `/${market}/search`;
  };

  return (
    <>
      <SearchFilters market={market} query={query} facets={facets} total={total} />

      {items.length === 0 ? (
        <div className="mt-8 border border-line bg-surface p-16 text-center">
          <p className="font-display text-2xl">
            {filtered ? "Nothing matches those filters" : "Nothing listed here yet"}
          </p>
          <p className="mt-3 max-w-[46ch] mx-auto text-sm text-ink-soft">
            {filtered
              ? "Try widening the price range or clearing an area filter."
              : `We are onboarding agencies in ${MARKETS[market].label} now.`}
          </p>
          {filtered && (
            <>
              <Link
                href={`/${market}/search`}
                className="label mt-6 inline-block hover:text-brass"
              >
                Clear filters &rarr;
              </Link>
              {/* Zero results is exactly when following a search is most
                  useful — the buyer wants something we do not have yet. */}
              <div className="mx-auto mt-2 max-w-md text-left">
                <SaveSearch
                  market={market}
                  queryString={toSearchParams({ ...query, page: 1 })}
                  summary={describeQuery(query, market)}
                />
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((l, i) => (
              <ListingCard key={l.slug} listing={l} priority={i < 3} />
            ))}
          </div>

          {pages > 1 && (
            <nav
              aria-label="Pagination"
              className="mt-10 flex flex-wrap items-center justify-center gap-2"
            >
              {page > 1 && (
                <Link href={pageHref(page - 1)} className="label border border-line px-4 py-2.5 hover:border-brass">
                  &larr; Previous
                </Link>
              )}
              {Array.from({ length: pages }).map((_, i) => (
                <Link
                  key={i}
                  href={pageHref(i + 1)}
                  aria-current={page === i + 1 ? "page" : undefined}
                  className={`label border px-4 py-2.5 tnum transition-colors ${
                    page === i + 1
                      ? "border-brass bg-brass-wash !text-brass"
                      : "border-line hover:border-brass"
                  }`}
                >
                  {i + 1}
                </Link>
              ))}
              {page < pages && (
                <Link href={pageHref(page + 1)} className="label border border-line px-4 py-2.5 hover:border-brass">
                  Next &rarr;
                </Link>
              )}
            </nav>
          )}

          {filtered && (
            <div className="mx-auto mt-4 max-w-xl">
              <SaveSearch
                market={market}
                queryString={toSearchParams({ ...query, page: 1 })}
                summary={describeQuery(query, market)}
              />
            </div>
          )}
        </>
      )}
    </>
  );
}

function Skeleton() {
  return (
    <div aria-hidden>
      <div className="h-[74px] animate-pulse border border-line bg-surface" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border border-line bg-surface">
            <div className="aspect-[4/3] animate-pulse bg-surface-2" />
            <div className="flex flex-col gap-3 p-5">
              <div className="h-7 w-2/5 animate-pulse bg-surface-2" />
              <div className="h-4 w-4/5 animate-pulse bg-surface-2" />
              <div className="h-4 w-1/3 animate-pulse bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
