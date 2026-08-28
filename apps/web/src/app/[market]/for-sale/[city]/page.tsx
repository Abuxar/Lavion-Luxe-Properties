import { notFound } from "next/navigation";
import type { Market } from "@lavion/schema";
import { MARKETS } from "@lavion/schema";
import { AreaGuideView } from "@/components/area-guide";
import { getAreaGuide, getAreaTaxonomy } from "@/lib/areas";

const VALID: Market[] = ["uk", "ae", "pk"];

export async function generateStaticParams() {
  const tax = await getAreaTaxonomy();
  return tax
    .filter((t) => !t.localitySlug)
    .map((t) => ({ market: t.market, city: t.citySlug }));
}

export async function generateMetadata({ params }: PageProps<"/[market]/for-sale/[city]">) {
  const { market, city } = await params;
  const guide = await getAreaGuide(market as Market, city);
  if (!guide) return { title: "Area not found" };

  const label = MARKETS[market as Market].label;
  return {
    title: `Property for sale in ${guide.city}`,
    description: `${guide.stats.count} properties for sale in ${guide.city}, ${label}. Median asking price, price range and available property types.`,
    alternates: {
      canonical: `/${market}/for-sale/${city}`,
      languages: Object.fromEntries([
        // MARKETS carries real BCP-47 locales — the UK's region subtag is GB,
        // not UK, and an invalid hreflang is silently ignored by Google.
        ...VALID.map((m) => [MARKETS[m].locale, `/${m}`]),
        ["x-default", "/"],
      ]),
    },
    // Crawl-budget discipline: a guide earns indexation by holding real
    // inventory. Below the threshold it stays crawlable but out of the index.
    robots: guide.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

export default async function CityGuide({ params }: PageProps<"/[market]/for-sale/[city]">) {
  const { market, city } = await params;
  if (!VALID.includes(market as Market)) notFound();

  const guide = await getAreaGuide(market as Market, city);
  if (!guide) notFound();

  return <AreaGuideView guide={guide} />;
}
