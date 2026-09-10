import "server-only";

/**
 * Best-effort brute-force throttle for sign-in.
 *
 * This is deliberately in-memory. On serverless it is per-instance, so an
 * attacker spread across enough concurrent instances gets more attempts than
 * the nominal limit — it raises the cost of a password-guessing run rather
 * than making one impossible. A correct implementation needs shared state, and
 * that arrives with Atlas; a Blob round trip per login attempt would cost more
 * than it buys, and would itself be a way to burn the free tier's quota.
 *
 * It is still worth having. Fluid Compute reuses instances, so in practice a
 * single-source attack lands on a warm instance and is caught. What this must
 * never do is claim more than it delivers, hence this comment rather than a
 * "rate limited" badge in the UI.
 *
 * Keyed by email, not IP: the credential is the thing being guessed, and the
 * per-instance IP of a proxied request is a poor identifier anyway.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;
/** Bound the map so a spray of unique addresses cannot grow it without limit. */
const MAX_TRACKED = 2000;

const failures = new Map<string, { count: number; first: number }>();

function prune(now: number): void {
  for (const [k, v] of failures) {
    if (now - v.first > WINDOW_MS) failures.delete(k);
  }
  if (failures.size <= MAX_TRACKED) return;
  // Still oversized after pruning expired entries: drop oldest first.
  const byAge = [...failures.entries()].sort((a, b) => a[1].first - b[1].first);
  for (const [k] of byAge.slice(0, failures.size - MAX_TRACKED)) failures.delete(k);
}

/** How long the caller must wait, in seconds; 0 when they may try now. */
export function retryAfter(id: string): number {
  const now = Date.now();
  const rec = failures.get(id.toLowerCase());
  if (!rec) return 0;
  if (now - rec.first > WINDOW_MS) {
    failures.delete(id.toLowerCase());
    return 0;
  }
  if (rec.count < MAX_FAILURES) return 0;
  return Math.ceil((rec.first + WINDOW_MS - now) / 1000);
}

export function recordFailure(id: string): void {
  const now = Date.now();
  prune(now);
  const k = id.toLowerCase();
  const rec = failures.get(k);
  if (!rec || now - rec.first > WINDOW_MS) {
    failures.set(k, { count: 1, first: now });
    return;
  }
  rec.count += 1;
}

export function clearFailures(id: string): void {
  failures.delete(id.toLowerCase());
}
