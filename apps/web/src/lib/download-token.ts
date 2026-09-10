import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived token proving someone passed the download gate.
 *
 * The point is capturing the lead, not protecting the document — anyone can
 * forward the PDF afterwards, and that is fine. What this prevents is the
 * download URL circulating as a way to skip the form entirely.
 *
 * Signed with ADMIN_PASSPHRASE so there is no second secret to manage. If it
 * is unset the gate fails closed, exactly as the admin queue does.
 */

const TTL_MS = 15 * 60 * 1000;

function secret(): string | null {
  const p = process.env.ADMIN_PASSPHRASE;
  return p && p.length >= 8 ? p : null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("hex").slice(0, 32);
}

export function issueDownloadToken(market: string, slug: string): string | null {
  const key = secret();
  if (!key) return null;
  const exp = Date.now() + TTL_MS;
  const payload = `${market}:${slug}:${exp}`;
  return `${exp}.${sign(payload, key)}`;
}

export function verifyDownloadToken(
  market: string,
  slug: string,
  token: string | null,
): boolean {
  const key = secret();
  if (!key || !token) return false;

  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || !sig) return false;
  if (Date.now() > exp) return false;

  const expected = sign(`${market}:${slug}:${exp}`, key);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
