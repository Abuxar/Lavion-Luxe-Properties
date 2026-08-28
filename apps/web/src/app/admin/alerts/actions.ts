"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { acknowledgeMatches, setSavedSearchActive } from "@/lib/saved-searches";

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
