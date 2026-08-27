import Image from "next/image";
import Link from "next/link";
import type { Market } from "@lavion/schema";
import { formatArea, formatPrice, statusLabel } from "@/lib/format";
import type { ListingSummary } from "@/lib/listings";

/**
 * The card carries the four things a buyer scans for — price, place, size,
 * beds — and nothing else. No motion library: the hover treatment is CSS,
 * because this component renders on search results, which are judged on INP.
 */
export function ListingCard({
  listing,
  priority = false,
}: {
  listing: ListingSummary;
  priority?: boolean;
}) {
  const href = `/${listing.market}/property/${listing.slug}`;
  const sold = listing.status === "sold" || listing.status === "let";

  return (
    <article
      data-reveal
      className="group relative flex flex-col overflow-hidden border border-line bg-surface transition-colors duration-300 hover:border-brass"
    >
      <Link href={href} className="absolute inset-0 z-10" aria-label={listing.title}>
        <span className="sr-only">{listing.title}</span>
      </Link>

      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        <Image
          src={listing.media[0]?.cloudinaryId ?? "lavion/samples/placeholder"}
          alt={listing.media[0]?.alt ?? listing.title}
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
        />

        {/* Sold and let listings keep their URL and their rankings — the badge
            explains state rather than the page 404ing. */}
        {sold && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/45 backdrop-blur-[1px]">
            <span className="label !text-paper border border-paper/50 px-3 py-1.5">
              {statusLabel(listing.status)}
            </span>
          </div>
        )}

        {listing.offPlan && !sold && (
          <span className="absolute left-3 top-3 label !text-ink bg-brass-wash border border-brass/40 px-2 py-1">
            Off-plan
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-2xl leading-none tnum">
            {listing.price.qualifier === "from" && (
              <span className="font-sans text-xs text-ink-faint mr-1.5">from</span>
            )}
            {formatPrice(listing.price.amount, listing.price.currency, listing.market)}
          </p>
        </div>

        <h3 className="font-sans text-[15px] font-medium leading-snug text-ink">
          {listing.title}
        </h3>

        <p className="label !normal-case !tracking-normal !text-[13px] font-sans text-ink-soft">
          {listing.location.locality}, {listing.location.city}
        </p>

        <div className="mt-auto flex items-center gap-4 border-t border-line pt-3 label tnum">
          {listing.bedrooms !== undefined && <span>{listing.bedrooms} bed</span>}
          {listing.bathrooms !== undefined && <span>{listing.bathrooms} bath</span>}
          <span className="ml-auto text-ink-soft">
            {formatArea(listing.area.canonicalSqft, listing.market as Market)}
          </span>
        </div>
      </div>
    </article>
  );
}
