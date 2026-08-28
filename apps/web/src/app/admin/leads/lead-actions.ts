"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { setLeadStatus, type LeadStatus } from "@/lib/leads";

export async function markLeadAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "new") as LeadStatus;
  await setLeadStatus(id, status);
  revalidatePath("/admin/leads");
}
