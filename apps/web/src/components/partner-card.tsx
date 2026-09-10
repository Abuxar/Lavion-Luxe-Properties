import Link from "next/link";
import { PARTNER_SERVICE_LABEL, type Market, type PartnerService } from "@lavion/schema";
import type { Agency } from "@/lib/accounts";

/**
 * The featured partner, pinned above the other agents.
 *
 * Disclosed as a partner rather than dressed up as an ordinary result — the
 * same principle as the Featured badge on promoted listings. A visitor should
 * be able to tell that this placement is a relationship, not a ranking they
 * earned by matching the search.
 *
 * Each service links straight into filtered inventory, so "build" is not a
 * dead label: it is the same `transaction` value the search and the listing
 * forms use.
 */

const SERVICE_QUERY: Record<PartnerService, string> = {
  buy: "transaction=sale",
  rent: "transaction=rent",
  build: "transaction=build",
};

const SERVICE_NOTE: Record<PartnerService, string> = {
  buy: "Acquisitions, from search to completion",
  rent: "Lettings and tenancy management",
  build: "Plots and ground-up development",
};

export function PartnerCard({
  partner,
  market,
}: {
  partner: Agency;
  market: Market;
}) {
  const services = partner.services ?? [];

  return (
    <section className="border border-brass/40 bg-brass-wash/40">
      <div className="border-b border-brass/25 px-6 py-3">
        <p className="label !text-brass">Featured partner</p>
      </div>

      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h2 className="font-display text-[clamp(1.6rem,3vw,2.4rem)] leading-tight">
            {partner.name}
          </h2>
          {partner.tagline && (
            <p className="mt-3 text-lg leading-snug text-ink-soft">{partner.tagline}</p>
          )}
          <div className="rule-brass mt-5 w-24" />
          {partner.blurb && (
            <p className="mt-5 max-w-[52ch] leading-relaxed text-ink-soft">{partner.blurb}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            {partner.established && (
              <span className="label">Established {partner.established}</span>
            )}
            <Link href={`/${market}/partner`} className="label hover:text-brass">
              About this partner &rarr;
            </Link>
          </div>
        </div>

        {services.length > 0 && (
          <ul className="grid gap-px self-start bg-brass/20">
            {services.map((s) => (
              <li key={s}>
                <Link
                  href={`/${market}/search?${SERVICE_QUERY[s]}`}
                  className="group flex items-center justify-between gap-4 bg-paper p-5 transition-colors hover:bg-surface"
                >
                  <span>
                    <span className="block font-display text-xl group-hover:text-brass">
                      {PARTNER_SERVICE_LABEL[s]}
                    </span>
                    <span className="label mt-1 block !normal-case !tracking-normal">
                      {SERVICE_NOTE[s]}
                    </span>
                  </span>
                  <span aria-hidden className="text-brass transition-transform group-hover:translate-x-1">
                    &rarr;
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
