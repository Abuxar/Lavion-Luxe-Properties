import "server-only";
import { MARKETS } from "@lavion/schema";
import { emailProvider, savedSearchAlert, type AlertProperty } from "./email";
import { formatPrice } from "./format";
import { getListings } from "./listings";
import { acknowledgeMatches, savedSearchesWithMatches } from "./saved-searches";
import { SITE_URL } from "./brand";

/**
 * F01 dispatch.
 *
 * Completes the saved-search loop: matching already worked, this sends. It is
 * the only piece that was waiting on a provider, so everything above it —
 * subscriptions, the match predicate, the seen-slug bookkeeping — is unchanged.
 *
 * Two rules:
 *
 * 1. A subscription is only acknowledged after its email is actually accepted.
 *    Marking first would mean a provider outage silently swallows the one batch
 *    a subscriber was waiting for, and nothing would ever resend it.
 *
 * 2. With no provider configured this reports `skipped` per subscription rather
 *    than claiming success. The admin page shows that state plainly.
 */

const SITE = SITE_URL;

export interface DispatchRow {
  id: string;
  email: string;
  label: string;
  matches: number;
  outcome: "sent" | "skipped" | "failed" | "nothing-new";
  detail?: string;
}

export interface DispatchSummary {
  providerConfigured: boolean;
  providerName: string;
  sent: number;
  skipped: number;
  failed: number;
  nothingNew: number;
  rows: DispatchRow[];
}

export async function dispatchSavedSearchAlerts(opts: { dryRun?: boolean } = {}): Promise<DispatchSummary> {
  const provider = emailProvider();
  const subs = await savedSearchesWithMatches();

  const rows: DispatchRow[] = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let nothingNew = 0;

  // Listings are fetched once per market, not once per subscriber — a hundred
  // subscribers watching Dubai should not be a hundred reads.
  const byMarket = new Map<string, Awaited<ReturnType<typeof getListings>>>();

  for (const s of subs) {
    if (!s.active || s.newSlugs.length === 0) {
      nothingNew++;
      rows.push({
        id: s.id,
        email: s.email,
        label: s.label,
        matches: s.matchCount,
        outcome: "nothing-new",
      });
      continue;
    }

    if (!byMarket.has(s.market)) byMarket.set(s.market, await getListings(s.market));
    const listings = byMarket.get(s.market)!;

    const properties: AlertProperty[] = s.newSlugs
      .map((slug) => listings.find((l) => l.slug === slug))
      .filter((l): l is NonNullable<typeof l> => Boolean(l))
      .slice(0, 6)
      .map((l) => ({
        title: l.title,
        price: formatPrice(l.price.amount, l.price.currency, l.market),
        locality: l.location.locality,
        city: l.location.city,
        beds: l.bedrooms,
        url: `${SITE}/${l.market}/property/${l.slug}`,
      }));

    if (!properties.length) {
      nothingNew++;
      rows.push({
        id: s.id,
        email: s.email,
        label: s.label,
        matches: s.matchCount,
        outcome: "nothing-new",
        detail: "Matches no longer resolve to live listings",
      });
      continue;
    }

    const msg = savedSearchAlert({
      name: s.name,
      searchLabel: s.label,
      properties,
      manageUrl: `${SITE}/${s.market}/search`,
    });

    if (opts.dryRun) {
      skipped++;
      rows.push({
        id: s.id,
        email: s.email,
        label: s.label,
        matches: properties.length,
        outcome: "skipped",
        detail: `Preview only — would send "${msg.subject}"`,
      });
      continue;
    }

    const result = await provider.send({
      to: s.email,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });

    if (result.status === "sent") {
      // Acknowledge only after the provider accepted it.
      await acknowledgeMatches(s.id);
      sent++;
      rows.push({
        id: s.id,
        email: s.email,
        label: s.label,
        matches: properties.length,
        outcome: "sent",
      });
    } else if (result.status === "skipped") {
      skipped++;
      rows.push({
        id: s.id,
        email: s.email,
        label: s.label,
        matches: properties.length,
        outcome: "skipped",
        detail: result.reason,
      });
    } else {
      failed++;
      rows.push({
        id: s.id,
        email: s.email,
        label: s.label,
        matches: properties.length,
        outcome: "failed",
        detail: result.error,
      });
    }
  }

  return {
    providerConfigured: provider.configured,
    providerName: provider.name,
    sent,
    skipped,
    failed,
    nothingNew,
    rows,
  };
}

/** Human label for the market, used in the admin summary. */
export function marketLabel(m: string): string {
  return MARKETS[m as keyof typeof MARKETS]?.label ?? m;
}
