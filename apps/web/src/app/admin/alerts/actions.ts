"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { acknowledgeMatches, setSavedSearchActive } from "@/lib/saved-searches";
import { dispatchSavedSearchAlerts, type DispatchSummary } from "@/lib/alert-dispatch";

export async function ackAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  await acknowledgeMatches(String(formData.get("id") ?? ""));
  revalidatePath("/admin/alerts");
}

export async function toggleAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  await setSavedSearchActive(
    String(formData.get("id") ?? ""),
    formData.get("active") === "true",
  );
  revalidatePath("/admin/alerts");
}

/* ---------- F01 dispatch ---------- */

export type DispatchState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "done"; summary: DispatchSummary; dryRun: boolean };

export async function dispatchAction(
  _prev: DispatchState,
  formData: FormData,
): Promise<DispatchState> {
  if (!(await isAdmin())) return { status: "error", message: "Not permitted." };

  const dryRun = formData.get("dryRun") === "on";
  const summary = await dispatchSavedSearchAlerts({ dryRun });

  revalidatePath("/admin/alerts");
  return { status: "done", summary, dryRun };
}
