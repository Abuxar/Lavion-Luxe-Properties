"use server";

import { revalidatePath, updateTag } from "next/cache";
import {
  promotionCurrency,
  promotionPrice,
  type PromotionTier,
} from "@lavion/schema";
import { isAdmin } from "@/lib/admin-auth";
import { promoteListing, clearPromotion } from "@/lib/submissions";

const DAYS = 30;

export async function promoteAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;

  const id = String(formData.get("id") ?? "");
  const tier = String(formData.get("tier") ?? "featured") as PromotionTier;
  const market = String(formData.get("market") ?? "uk") as "uk" | "ae" | "pk";

  const startsAt = new Date();
  const expiresAt = new Date(startsAt);
  expiresAt.setDate(expiresAt.getDate() + DAYS);

  await promoteListing(id, {
    tier,
    startsAt,
    expiresAt,
    feeAmount: promotionPrice(market, tier),
    feeCurrency: promotionCurrency(market),
    purchasedBy: "admin",
    // Nothing is charged yet — billing is reconciled separately once a payment
    // rail exists, so promotions are recorded unpaid rather than pretending.
    paid: false,
  });

  updateTag("listings");
  revalidatePath("/admin/revenue");
}

export async function clearPromotionAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  await clearPromotion(String(formData.get("id") ?? ""));
  updateTag("listings");
  revalidatePath("/admin/revenue");
}
