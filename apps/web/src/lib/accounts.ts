import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Market, SubscriptionTier } from "@lavion/schema";
import { createBlobCollection } from "./blob-collection";
import { brandEmail } from "./brand";

/**
 * Users and agencies.
 *
 * Replaces the single shared passphrase, which was always marked a phase-1
 * placeholder: one secret, no identity, no scoping, and no way to remove one
 * person's access without changing everyone's.
 *
 * Passwords use scrypt from Node's own crypto — memory-hard, no dependency,
 * and nothing here ever stores or logs a plaintext password.
 */

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEYLEN = 64;

export type Role = "super_admin" | "agency_admin" | "agent";

/** Staff see everything; agency roles are scoped to their own agency. */
export const STAFF_ROLES: Role[] = ["super_admin"];
export const AGENCY_ROLES: Role[] = ["agency_admin", "agent"];

export interface Agency {
  id: string;
  name: string;
  market: Market;
  tier: SubscriptionTier;
  createdAt: string;
  active: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Required for agency roles, absent for staff. */
  agencyId?: string;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
  active: boolean;
}

const users = createBlobCollection<User>({ key: "queue/users.json", seed: [] });
const agencies = createBlobCollection<Agency>({ key: "queue/agencies.json", seed: [] });

/* ---------- password hashing ---------- */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;

  const key = await scrypt(password, Buffer.from(saltHex, "hex"), KEYLEN);
  const expected = Buffer.from(keyHex, "hex");
  if (key.length !== expected.length) return false;
  return timingSafeEqual(key, expected);
}

/* ---------- seeding ---------- */

const norm = (e: string) => e.trim().toLowerCase();

/**
 * Ensures a super admin exists, seeded from the environment.
 *
 * ADMIN_PASSPHRASE was already the way in, so reusing it as the initial
 * password means nobody is locked out by this change. The account is created
 * once; changing the env var afterwards does not silently reset the password.
 */
export async function ensureSeedAdmin(): Promise<User | null> {
  const pass = process.env.ADMIN_PASSPHRASE;
  if (!pass || pass.length < 8) return null;

  const email = norm(process.env.ADMIN_EMAIL ?? brandEmail("admin"));
  const existing = (await users.all()).find((u) => norm(u.email) === email);
  if (existing) return existing;

  const rows = await users.all();
  const user: User = {
    id: "usr_001",
    email,
    name: "Super Admin",
    role: "super_admin",
    passwordHash: await hashPassword(pass),
    createdAt: new Date().toISOString(),
    active: true,
  };
  await users.replace([...rows, user]);
  return user;
}

/* ---------- users ---------- */

function nextUserId(rows: User[]): string {
  const max = rows.reduce((a, u) => {
    const n = Number(u.id.replace("usr_", ""));
    return Number.isFinite(n) && n > a ? n : a;
  }, 0);
  return `usr_${String(max + 1).padStart(3, "0")}`;
}

export async function listUsers(): Promise<User[]> {
  await ensureSeedAdmin();
  return (await users.all()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  await ensureSeedAdmin();
  return (await users.all()).find((u) => norm(u.email) === norm(email));
}

export async function getUser(id: string): Promise<User | undefined> {
  await ensureSeedAdmin();
  return (await users.all()).find((u) => u.id === id);
}

export async function createUser(input: {
  email: string;
  name: string;
  role: Role;
  agencyId?: string;
  password: string;
}): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  if (input.password.length < 10)
    return { ok: false, error: "Password must be at least 10 characters." };
  if (AGENCY_ROLES.includes(input.role) && !input.agencyId)
    return { ok: false, error: "Agency roles must belong to an agency." };

  const rows = await users.all();
  if (rows.some((u) => norm(u.email) === norm(input.email)))
    return { ok: false, error: "That email already has an account." };

  const user: User = {
    id: nextUserId(rows),
    email: norm(input.email),
    name: input.name,
    role: input.role,
    agencyId: AGENCY_ROLES.includes(input.role) ? input.agencyId : undefined,
    passwordHash: await hashPassword(input.password),
    createdAt: new Date().toISOString(),
    active: true,
  };
  await users.replace([...rows, user]);
  return { ok: true, user };
}

export async function setUserActive(id: string, active: boolean) {
  return users.update((u) => u.id === id, (u) => ({ ...u, active }));
}

export async function recordLogin(id: string) {
  return users.update((u) => u.id === id, (u) => ({ ...u, lastLoginAt: new Date().toISOString() }));
}

/* ---------- agencies ---------- */

function nextAgencyId(rows: Agency[]): string {
  const max = rows.reduce((a, x) => {
    const n = Number(x.id.replace("agy_", ""));
    return Number.isFinite(n) && n > a ? n : a;
  }, 0);
  return `agy_${String(max + 1).padStart(3, "0")}`;
}

export async function listAgencies(): Promise<Agency[]> {
  return (await agencies.all()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAgency(id: string): Promise<Agency | undefined> {
  return (await agencies.all()).find((a) => a.id === id);
}

export async function createAgency(input: {
  name: string;
  market: Market;
  tier: SubscriptionTier;
}): Promise<Agency> {
  const rows = await agencies.all();
  const agency: Agency = {
    id: nextAgencyId(rows),
    name: input.name,
    market: input.market,
    tier: input.tier,
    createdAt: new Date().toISOString(),
    active: true,
  };
  await agencies.replace([...rows, agency]);
  return agency;
}

export async function setAgencyTier(id: string, tier: SubscriptionTier) {
  return agencies.update((a) => a.id === id, (a) => ({ ...a, tier }));
}

export async function setAgencyActive(id: string, active: boolean) {
  return agencies.update((a) => a.id === id, (a) => ({ ...a, active }));
}

/** Never let a password hash reach a client component. */
export function publicUser(u: User) {
  const { passwordHash: _omit, ...rest } = u;
  return rest;
}
