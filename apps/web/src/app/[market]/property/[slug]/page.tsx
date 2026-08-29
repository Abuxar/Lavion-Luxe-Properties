import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { evaluateEligibility, MARKETS, type Market } from "@lavion/schema";
import { EnquiryForm } from "@/components/enquiry-form";
import { PropertyGallery } from "@/components/property-gallery";
import { SaveButton } from "@/components/shortlist";
import { YieldCalculator } from "@/components/yield-calculator";
import { ListingCard } from "@/components/listing-card";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { routeToAgent } from "@/lib/agents";
import { getSimilarListings, slugify } from "@/lib/areas";
import { formatArea, formatPrice, statusLabel, whatsappLink } from "@/lib/format";
import { getAllSlugs, getListing, type ListingDetail } from "@/lib/listings";

const VALID: Market[] = ["uk", "ae", "pk"];

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map(({ market, slug }) => ({ market, slug }));
}

export async function generateMetadata({ params }: PageProps<"/[market]/property/[slug]">) {
  const { market, slug } = await params;
  const listing = await getListing(market as Market, slug);
  if (!listing) return { title: "Property not found" };

  return {
    title: listing.title,
    description: listing.description.slice(0, 155),
    alternates: { canonical: `/${market}/property/${slug}` },
    openGraph: { title: listing.title, description: listing.description.slice(0, 155) },
  };
}

export default async function PropertyPage({
  params,
}: PageProps<"/[market]/property/[slug]">) {
  const { market, slug } = await params;
  if (!VALID.includes(market as Market)) notFound();
  const m = market as Market;

  const listing = await getListing(m, slug);
  if (!listing) notFound();

  const eligibility = evaluateEligibility(listing as never);
  const sold = listing.status === "sold" || listing.status === "let";

  // F08 — the enquiry goes to whoever covers this territory, and the WhatsApp
  // link uses that agent's real number rather than a placeholder.
  const agent = routeToAgent(m, {
    locality: listing.location.locality,
    city: listing.location.city,
  });

  return (
    <>
      <SiteHeader market={m} />

      {/* Structured data is what puts a listing into property rich results. */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildJsonLd(listing, m)) }}
      />

      <main className="flex-1">
        <div className="mx-auto max-w-[1400px] px-6 pt-8">
          <nav aria-label="Breadcrumb" className="label">
            <Link href={`/${m}`} className="hover:text-brass">
              {MARKETS[m].label}
            </Link>
            <span className="mx-2 text-line-strong">/</span>
            <Link
              href={`/${m}/for-sale/${slugify(listing.location.city)}`}
              className="hover:text-brass"
            >
              {listing.location.city}
            </Link>
            <span className="mx-2 text-line-strong">/</span>
            <Link
              href={`/${m}/for-sale/${slugify(listing.location.city)}/${slugify(listing.location.locality)}`}
              className="hover:text-brass"
            >
              {listing.location.locality}
            </Link>
          </nav>
        </div>

        {/* ---------- gallery ---------- */}
        <section className="mx-auto mt-6 max-w-[1400px] px-6">
          <PropertyGallery
            title={listing.title}
            images={
              listing.media.length
                ? listing.media.map((mm, i) => ({
                    src: mm.cloudinaryId,
                    alt: mm.alt ?? `${listing.title} — photo ${i + 1}`,
                  }))
                : [{ src: "/samples/placeholder.svg", alt: listing.title }]
            }
            overlay={
              sold ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/45">
                  <span className="label !text-paper border border-paper/50 px-4 py-2">
                    {statusLabel(listing.status)}
                  </span>
                </div>
              ) : undefined
            }
          />
        </section>

        <div className="mx-auto grid max-w-[1400px] gap-12 px-6 py-12 lg:grid-cols-[1.6fr_1fr]">
          {/* ---------- body: cached, part of the static shell ---------- */}
          <div>
            <p className="label">
              {listing.category} · {listing.transaction === "sale" ? "For sale" : "To rent"}
              {listing.offPlan && " · Off-plan"}
            </p>
            <h1 className="mt-4 font-display text-[clamp(1.9rem,4vw,3rem)] leading-[1.1]">
              {listing.title}
            </h1>
            <p className="mt-3 text-ink-soft">
              {listing.location.locality}, {listing.location.city}
            </p>

            <div className="rule-brass mt-8 w-32" />

            <dl className="mt-8 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
              <Stat k="Bedrooms" v={listing.bedrooms ?? "—"} />
              <Stat k="Bathrooms" v={listing.bathrooms ?? "—"} />
              <Stat k="Area" v={formatArea(listing.area.canonicalSqft, m)} />
              <Stat k="Tenure" v={listing.tenure ?? "—"} />
            </dl>

            <div className="mt-10 max-w-[65ch] leading-relaxed text-ink-soft">
              {listing.description.split("\n").map((p, i) => (
                <p key={i} className="mt-4 first:mt-0">
                  {p}
                </p>
              ))}
            </div>

            {listing.amenities.length > 0 && (
              <div className="mt-10">
                <p className="label">Amenities</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {listing.amenities.map((a) => (
                    <li key={a} className="border border-line px-3 py-1.5 text-sm text-ink-soft">
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ComplianceBlock listing={listing} market={m} />

            <YieldCalculator
              price={listing.price.amount}
              currency={listing.price.currency}
              market={m}
            />
          </div>

          {/* ---------- sidebar ---------- */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="border border-line bg-surface p-7">
              {/* Price and availability are the volatile fields — they stream
                  at request time while everything above is prerendered. */}
              <Suspense fallback={<PriceSkeleton />}>
                <LivePrice listing={listing} market={m} />
              </Suspense>

              <div className="mt-6 flex flex-col gap-3">
                <a
                  href={whatsappLink(
                    agent.phone,
                    listing.title,
                    `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/${m}/property/${listing.slug}`,
                  )}
                  className="inline-flex items-center justify-center gap-2 bg-ink px-6 py-4 text-sm font-medium text-paper transition-colors hover:bg-brass"
                >
                  Enquire on WhatsApp
                </a>
                <SaveButton
                  variant="full"
                  item={{
                    slug: listing.slug,
                    market: m,
                    title: listing.title,
                    price: listing.price.amount,
                    currency: listing.price.currency,
                    locality: listing.location.locality,
                    city: listing.location.city,
                    bedrooms: listing.bedrooms,
                    bathrooms: listing.bathrooms,
                    sqft: listing.area.canonicalSqft,
                    image: listing.media[0]?.cloudinaryId,
                  }}
                />
                <EnquiryForm
                  market={m}
                  listingSlug={listing.slug}
                  listingTitle={listing.title}
                  locality={listing.location.locality}
                  city={listing.location.city}
                />
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <p className="label">Your contact</p>
                <p className="mt-2 text-sm font-medium">{agent.name}</p>
                <p className="text-xs text-ink-faint">{agent.title}</p>
                <p className="label mt-2 !normal-case !tracking-normal">
                  Speaks {agent.languages.join(", ")}
                </p>
              </div>

              {eligibility.length > 0 && (
                <div className="mt-7 border-t border-line pt-6">
                  <p className="label">Investor eligibility</p>
                  <ul className="mt-4 flex flex-col gap-4">
                    {eligibility.map((f) => (
                      <li key={f.key}>
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className={`h-1.5 w-1.5 rounded-full ${
                              f.met ? "bg-brass" : "bg-line-strong"
                            }`}
                          />
                          <span className="text-sm font-medium">{f.label}</span>
                        </div>
                        <p className="mt-1.5 pl-3.5 text-xs leading-relaxed text-ink-faint">
                          {f.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 text-[11px] leading-relaxed text-ink-faint">
                    General information, not legal or tax advice. Confirm with a
                    qualified adviser in the relevant jurisdiction.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* A sold listing keeps its URL and its accumulated authority. Rather
            than 404 and throw that away, show what it means and offer live
            alternatives — "what did this sell for" is high-intent traffic. */}
        <Suspense fallback={null}>
          <SimilarSection market={m} listing={listing} sold={sold} />
        </Suspense>
      </main>

      <SiteFooter market={m} />
    </>
  );
}

async function SimilarSection({
  market,
  listing,
  sold,
}: {
  market: Market;
  listing: ListingDetail;
  sold: boolean;
}) {
  const similar = await getSimilarListings(market, listing);
  if (!similar.length) return null;

  return (
    <section className="border-t border-line bg-surface">
      <div className="mx-auto max-w-[1400px] px-6 py-14">
        <p className="label">{sold ? "Still available nearby" : "Similar properties"}</p>
        <h2 className="mt-3 font-display text-3xl">
          {sold
            ? `Available now in ${listing.location.locality}`
            : `More in ${listing.location.locality}`}
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {similar.map((l) => (
            <ListingCard key={l.slug} listing={l} />
          ))}
        </div>
        <Link
          href={`/${market}/for-sale/${slugify(listing.location.city)}/${slugify(listing.location.locality)}`}
          className="label mt-8 inline-block hover:text-brass"
        >
          All property in {listing.location.locality} &rarr;
        </Link>
      </div>
    </section>
  );
}

/* ---------- pieces ---------- */

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="bg-paper p-4">
      <dt className="label">{k}</dt>
      <dd className="mt-1.5 text-lg capitalize tnum">{v}</dd>
    </div>
  );
}

async function LivePrice({ listing, market }: { listing: ListingDetail; market: Market }) {
  return (
    <>
      <p className="label">{statusLabel(listing.status)}</p>
      <p className="mt-2 font-display text-4xl leading-none tnum">
        {listing.price.qualifier === "from" && (
          <span className="mr-2 font-sans text-sm text-ink-faint">from</span>
        )}
        {formatPrice(listing.price.amount, listing.price.currency, market)}
      </p>
    </>
  );
}

function PriceSkeleton() {
  return (
    <div aria-hidden>
      <div className="h-3 w-20 animate-pulse bg-surface-2" />
      <div className="mt-3 h-9 w-2/3 animate-pulse bg-surface-2" />
    </div>
  );
}

/**
 * Compliance is shown, not just stored. In Dubai the permit number legally has
 * to appear on the advert; in the UK Material Information has to be up front.
 */
function ComplianceBlock({ listing, market }: { listing: ListingDetail; market: Market }) {
  const c = listing.compliance ?? {};
  const rows: [string, string][] = [];

  if (market === "ae" && c.ae) {
    if (c.ae.permitNumber) rows.push(["DLD permit number", String(c.ae.permitNumber)]);
    if (c.ae.developerName) rows.push(["Developer", String(c.ae.developerName)]);
    if (c.ae.escrowAccount) rows.push(["Escrow account", String(c.ae.escrowAccount)]);
    if (c.ae.completionDate)
      rows.push(["Expected completion", String(c.ae.completionDate).slice(0, 10)]);
  }
  if (market === "uk" && c.uk) {
    if (c.uk.tenureDetail) rows.push(["Tenure", String(c.uk.tenureDetail)]);
    if (c.uk.councilTaxBand) rows.push(["Council tax band", String(c.uk.councilTaxBand)]);
    if (c.uk.epcRating) rows.push(["EPC rating", String(c.uk.epcRating)]);
    if (c.uk.leaseholdYearsRemaining !== undefined)
      rows.push(["Lease remaining", `${c.uk.leaseholdYearsRemaining} years`]);
    if (c.uk.serviceChargeAnnual !== undefined)
      rows.push(["Service charge", formatPrice(Number(c.uk.serviceChargeAnnual), "GBP", "uk")]);
    if (c.uk.groundRentAnnual !== undefined)
      rows.push(["Ground rent", formatPrice(Number(c.uk.groundRentAnnual), "GBP", "uk")]);
  }
  if (market === "pk" && c.pk) {
    if (c.pk.societyName) rows.push(["Society", String(c.pk.societyName)]);
    if (c.pk.societyApprovalRef) rows.push(["Approval reference", String(c.pk.societyApprovalRef)]);
    if (c.pk.transferAuthority) rows.push(["Transfer authority", String(c.pk.transferAuthority)]);
  }

  if (!rows.length) return null;

  const heading =
    market === "uk" ? "Material information" : market === "ae" ? "Permit & disclosure" : "Verification";

  return (
    <section className="mt-12 border border-line bg-surface p-7">
      <p className="label !text-brass">{heading}</p>
      <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-line pb-2">
            <dt className="text-sm text-ink-faint">{k}</dt>
            <dd className="text-sm font-medium tnum">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function buildJsonLd(listing: ListingDetail, market: Market) {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: listing.title,
    description: listing.description,
    url: `/${market}/property/${listing.slug}`,
    datePosted: listing.publishedAt,
    offers: {
      "@type": "Offer",
      price: listing.price.amount,
      priceCurrency: listing.price.currency,
      availability:
        listing.status === "published"
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: listing.location.locality,
      addressRegion: listing.location.city,
      addressCountry: market.toUpperCase(),
    },
    numberOfBedrooms: listing.bedrooms,
    numberOfBathroomsTotal: listing.bathrooms,
    floorSize: {
      "@type": "QuantitativeValue",
      value: Math.round(listing.area.canonicalSqft),
      unitCode: "FTK",
    },
  };
}
