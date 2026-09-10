"use server";

import { revalidatePath } from "next/cache";
import type { Market, SubscriptionTier } from "@lavion/schema";
import {
  createAgency,
  createUser,
  setAgencyActive,
  setUserActive,
  setUserPassword,
  type Role,
} from "@/lib/accounts";
import { requireStaff } from "@/lib/session";

export type TeamState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ok"; message: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function createAgencyAction(
  _prev: TeamState,
  formData: FormData,
): Promise<TeamState> {
  if (!(await requireStaff())) return { status: "error", message: "Not permitted." };

  const name = str(formData, "name");
  if (name.length < 2) return { status: "error", message: "Give the agency a name." };

  const agency = await createAgency({
    name,
    market: str(formData, "market") as Market,
    tier: str(formData, "tier") as SubscriptionTier,
  });

  revalidatePath("/admin/team");
  return { status: "ok", message: `Created ${agency.name} (${agency.id}).` };
}

export async function createUserAction(
  _prev: TeamState,
  formData: FormData,
): Promise<TeamState> {
  if (!(await requireStaff())) return { status: "error", message: "Not permitted." };

  const role = str(formData, "role") as Role;
  const result = await createUser({
    email: str(formData, "email"),
    name: str(formData, "name"),
    role,
    agencyId: str(formData, "agencyId") || undefined,
    password: String(formData.get("password") ?? ""),
  });

  if (!result.ok) return { status: "error", message: result.error };

  revalidatePath("/admin/team");
  // The password is never echoed back — staff set it and pass it on out of band.
  return {
    status: "ok",
    message: `Created ${result.user.email} as ${role.replace("_", " ")}.`,
  };
}

export async function toggleUserAction(formData: FormData): Promise<void> {
  if (!(await requireStaff())) return;
  await setUserActive(String(formData.get("id") ?? ""), formData.get("active") === "true");
  revalidatePath("/admin/team");
}

export async function toggleAgencyAction(formData: FormData): Promise<void> {
  if (!(await requireStaff())) return;
  await setAgencyActive(String(formData.get("id") ?? ""), formData.get("active") === "true");
  revalidatePath("/admin/team");
}

/**
 * Rotate a user's password.
 *
 * Staff-only, and staff can reset anyone including themselves — with a single
 * super admin there is no one else to do it, and a leaked credential that
 * cannot be replaced is not a recoverable situation.
 */
export async function setPasswordAction(
  _prev: TeamState,
  formData: FormData,
): Promise<TeamState> {
  if (!(await requireStaff())) return { status: "error", message: "Not permitted." };

  const id = str(formData, "userId");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!id) return { status: "error", message: "Pick an account." };
  if (password !== confirm) return { status: "error", message: "The two passwords do not match." };

  const res = await setUserPassword(id, password);
  if (!res.ok) return { status: "error", message: res.error };

  revalidatePath("/admin/team");
  return { status: "ok", message: "Password changed. Existing sessions stay valid until they expire." };
}
