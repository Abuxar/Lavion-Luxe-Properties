/**
 * Shown on every guide. The line between explaining a rule and advising
 * someone what to do with their money is where regulated advice begins —
 * tax advice is separately regulated again. Keeping the content descriptive
 * and routing anything specific to a qualified professional is also a
 * lead-capture opportunity, so it costs nothing commercially.
 */
export function LegalDisclaimer({ market }: { market: string }) {
  const authority =
    market === "ae"
      ? "a UAE-licensed legal or tax adviser"
      : market === "uk"
        ? "a UK solicitor or tax adviser"
        : "a Pakistani legal or tax adviser";

  return (
    <aside className="mt-12 border border-line bg-surface p-6">
      <p className="label">General information, not advice</p>
      <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-ink-soft">
        This page explains how published rules work. It is not legal, tax or
        financial advice, and it does not recommend any particular investment.
        Thresholds and rates change — often at budget cycles — so confirm
        anything you intend to act on with {authority} before you rely on it.
      </p>
    </aside>
  );
}
