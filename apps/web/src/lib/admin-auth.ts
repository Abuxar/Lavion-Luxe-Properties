import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * PHASE 1 PLACEHOLDER — a single shared passphrase, not a user system.
 *
 * It exists because the review queue can publish listings and sits on a public
 * URL; shipping that ungated would be worse than shipping this. It is NOT the
 * RBAC described in the plan (super_admin / agency_admin / agent / …) and must
 * be replaced by the real JWT + role model before any agency gets access.
 *
 * Set ADMIN_PASSPHRASE in the environment. If it is unset the queue is sealed
 * rather than open, so a missing env var fails closed.
 */

const COOKIE = "lavion_admin";

function secret(): string | null {
  const p = process.env.ADMIN_PASSPHRASE;
  return p && p.length >= 8 ? p : null;
}

function sign(value: string, key: string): string {
  return createHmac("sha256", key).update(value).digest("hex");
}

/**
 * `await connection()` before every auth decision.
 *
 * Without it, an unconfigured environment short-circuits before touching
 * cookies(), nothing marks the route request-time, and Next prerenders the
 * signed-out page at build and caches it. That would both bake in a stale
 * "sealed" state and — far worse — risk caching a rendered queue.
 */
export async function isConfigured(): Promise<boolean> {
  await connection();
  return secret() !== null;
}

export async function isAdmin(): Promise<boolean> {
  await connection();
  const key = secret();
  if (!key) return false;

  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return false;

  const expected = sign("admin", key);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function signIn(passphrase: string): Promise<boolean> {
  const key = secret();
  if (!key) return false;

  const given = Buffer.from(passphrase);
  const real = Buffer.from(key);
  if (given.length !== real.length) return false;
  if (!timingSafeEqual(given, real)) return false;

  const jar = await cookies();
  jar.set(COOKIE, sign("admin", key), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return true;
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
