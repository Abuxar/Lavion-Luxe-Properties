import { notFound } from "next/navigation";
import type { Market } from "@lavion/schema";
import { MARKETS } from "@lavion/schema";
import { AreaGuideView } from "@/components/area-guide";
import { getAreaGuide, getAreaTaxonomy } from "@/lib/areas";

const VALID: Market[] = ["uk", "ae", "pk"];

export async function generateStaticParams() {
  const tax = await getAreaTaxonomy();
  return tax
    .filter((t) => t.localitySlug)
    .map((t) => ({ market: t.market, city: t.citySlug, locality: t.localitySlug! }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[market]/for-sale/[city]/[locality]">) {
  const { market, city, locality } = await params;
  const guide = await getAreaGuide(market as Market, city, locality);
  if (!guide) return { title: "Area not found" };

  const label = MARKETS[market as Market].label;
  return {
    title: `Property for sale in ${guide.locality}, ${guide.city}`,
    description: `${guide.stats.count} properties for sale in ${guide.locality}, ${guide.city}, ${label}. Asking prices, price per sq ft and available types.`,
    alternates: {
      canonical: `/${market}/for-sale/${city}/${locality}`,
      languages: Object.fromEntries([
        // MARKETS carries real BCP-47 locales — the UK's region subtag is GB,
        // not UK, and an invalid hreflang is silently ignored by Google.
        ...VALID.map((m) => [MARKETS[m].locale, `/${m}`]),
        ["x-default", "/"],
      ]),
    },
    robots: guide.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

export default async function LocalityGuide({
  params,
}: PageProps<"/[market]/for-sale/[city]/[locality]">) {
  const { market, city, locality } = await params;
  if (!VALID.includes(market as Market)) notFound();

  const guide = await getAreaGuide(market as Market, city, locality);
  if (!guide) notFound();

  return <AreaGuideView guide={guide} />;
}
