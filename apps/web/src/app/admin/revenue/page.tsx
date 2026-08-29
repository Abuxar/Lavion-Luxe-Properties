import { Suspense } from "react";
import Link from "next/link";
import {
  TIERS,
  calculateCommission,
  isPromotionLive,
  promotionPrice,
  type Market,
} from "@lavion/schema";
import { isAdmin, isConfigured } from "@/lib/admin-auth";
import { formatPrice } from "@/lib/format";
import { publishedSubmissions } from "@/lib/submissions";
import { SignInForm } from "../sign-in-form";
import { clearPromotionAction, promoteAction } from "./actions";

export default function RevenuePage() {
  return (
    <Suspense fallback={<div className="p-12 label">Loading…</div>}>
      <Gate />
    </Suspense>
  );
}

async function Gate() {
  if (!(await isAdmin())) return <SignInForm configured={await isConfigured()} />;

  const published = await publishedSubmissions();
  const now = new Date();

  const promoted = published.filter((s) =>
    isPromotionLive(s.listing.promotion as never, now),
  );

  // Committed promotion revenue, by currency — never summed across currencies,
  // because a single "total" mixing AED, GBP and PKR would be meaningless.
  const byCurrency = new Map<string, { booked: number; unpaid: number }>();
  for (const s of promoted) {
    const p = s.listing.promotion!;
    const prev = byCurrency.get(p.feeCurrency) ?? { booked: 0, unpaid: 0 };
    byCurrency.set(p.feeCurrency, {
      booked: prev.booked + p.feeAmount,
      unpaid: prev.unpaid + (p.paid ? 0 : p.feeAmount),
    });
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="label">Admin</p>
          <h1 className="mt-3 font-display text-4xl">Revenue</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/leads" className="label border border-line px-4 py-2 hover:border-brass">
            Leads
          </Link>
          <Link href="/admin" className="label border border-line px-4 py-2 hover:border-brass">
            Review queue
          </Link>
        </div>
      </div>

      <div className="mt-8 border border-ochre/50 bg-ochre-wash p-5">
        <p className="label" style={{ color: "var(--color-ochre)" }}>
          Billing not connected
        </p>
        <p className="mt-2 max-w-[72ch] text-sm leading-relaxed">
          Tiers, promotion pricing and commission arithmetic are live; collection
          is not. Stripe needs a merchant account per market, does not operate in
          Pakistan, and restricts marketplace payouts in the UAE. Promotions are
          therefore recorded <strong>unpaid</strong> and reconciled by hand until
          a payment rail exists.
        </p>
      </div>

      {/* ---- booked promotion revenue ---- */}
      <section className="mt-12">
        <h2 className="label">Promotion revenue booked</h2>
        {byCurrency.size === 0 ? (
          <p className="mt-4 border border-line bg-surface p-8 text-center text-sm text-ink-soft">
            No live promotions. Promote a listing below to book revenue.
          </p>
        ) : (
          <dl className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-3">
            {[...byCurrency.entries()].map(([cur, v]) => (
              <div key={cur} className="bg-paper p-5">
                <dt className="label">{cur} booked</dt>
                <dd className="mt-2 font-display text-3xl tnum">
                  {v.booked.toLocaleString()}
                </dd>
                {v.unpaid > 0 && (
                  <dd className="label mt-2 tnum" style={{ color: "var(--color-signal)" }}>
                    {v.unpaid.toLocaleString()} uncollected
                  </dd>
                )}
              </div>
            ))}
          </dl>
        )}
      </section>

      {/* ---- tiers ---- */}
      <section className="mt-12">
        <h2 className="label">Subscription tiers</h2>
        <div className="mt-4 grid gap-px bg-line sm:grid-cols-3">
          {Object.values(TIERS).map((t) => (
            <div key={t.tier} className="bg-paper p-6">
              <p className="font-display text-2xl">{t.label}</p>
              <p className="label mt-2 tnum">
                {(t.commissionRate * 100).toFixed(1)}% commission
              </p>
              <p className="label mt-1 tnum">
                {t.listingAllowance === null ? "Unlimited" : t.listingAllowance} listings ·{" "}
                {t.includedPromotions} promotions
              </p>
              <ul className="mt-4 flex flex-col gap-1.5">
                {t.features.map((f) => (
                  <li key={f} className="text-sm text-ink-soft">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ---- worked example ---- */}
      <section className="mt-12">
        <h2 className="label">What a completed sale earns</h2>
        <p className="mt-2 max-w-[62ch] text-sm text-ink-soft">
          Commission plus closing fee, per tier, on the highest-value listing in
          each market.
        </p>
        <div className="mt-4 overflow-x-auto border border-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-surface">
                <Th>Listing</Th>
                <Th>Sale price</Th>
                <Th>Starter</Th>
                <Th>Professional</Th>
                <Th>Enterprise</Th>
              </tr>
            </thead>
            <tbody>
              {topPerMarket(published).map((s) => {
                const m = s.listing.market as Market;
                return (
                  <tr key={s.id} className="border-t border-line">
                    <Td>{s.listing.title.slice(0, 40)}</Td>
                    <Td className="tnum">
                      {formatPrice(s.listing.price.amount, s.listing.price.currency, m, {
                        compact: true,
                      })}
                    </Td>
                    {(["starter", "professional", "enterprise"] as const).map((tier) => {
                      const c = calculateCommission({
                        salePrice: s.listing.price.amount,
                        market: m,
                        tier,
                      });
                      return (
                        <Td key={tier} className="tnum">
                          {formatPrice(c.total, c.currency, m, { compact: true })}
                        </Td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- promote ---- */}
      <section className="mt-12">
        <h2 className="label">Published listings</h2>
        <p className="mt-2 max-w-[62ch] text-sm text-ink-soft">
          A promoted listing leads the default result order and carries a
          Featured badge everywhere it appears. It does not override a sort the
          visitor chose themselves.
        </p>

        {published.length === 0 ? (
          <p className="mt-4 border border-line bg-surface p-8 text-center text-sm text-ink-soft">
            Nothing published yet.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-px bg-line">
            {published.map((s) => {
              const m = s.listing.market as Market;
              const p = s.listing.promotion;
              const live = isPromotionLive(p as never, now);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 bg-paper p-5">
                  <span className="label w-14 shrink-0">{m.toUpperCase()}</span>

                  <span className="min-w-[240px] flex-1">
                    <span className="block text-sm font-medium">{s.listing.title}</span>
                    <span className="label mt-1 block !normal-case !tracking-normal">
                      {s.listing.location.locality} ·{" "}
                      {formatPrice(s.listing.price.amount, s.listing.price.currency, m, {
                        compact: true,
                      })}
                    </span>
                  </span>

                  {live && p ? (
                    <>
                      <span className="label border border-brass/50 bg-brass-wash px-2 py-1 !text-brass">
                        {p.tier} · {p.feeCurrency} {p.feeAmount.toLocaleString()}
                        {!p.paid && " · unpaid"}
                      </span>
                      <form action={clearPromotionAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="label border border-line px-3 py-2 hover:border-brass">
                          End promotion
                        </button>
                      </form>
                    </>
                  ) : (
                    <span className="flex flex-wrap gap-2">
                      {(["featured", "premium", "spotlight"] as const).map((tier) => (
                        <form key={tier} action={promoteAction}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="market" value={m} />
                          <input type="hidden" name="tier" value={tier} />
                          <button className="label border border-line px-3 py-2 hover:border-brass">
                            {tier} · {promotionPrice(m, tier).toLocaleString()}
                          </button>
                        </form>
                      ))}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function topPerMarket<T extends { listing: { market: string; price: { amount: number } } }>(
  rows: T[],
): T[] {
  const best = new Map<string, T>();
  for (const r of rows) {
    const cur = best.get(r.listing.market);
    if (!cur || r.listing.price.amount > cur.listing.price.amount) {
      best.set(r.listing.market, r);
    }
  }
  return [...best.values()];
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="label px-4 py-3 text-left">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}
