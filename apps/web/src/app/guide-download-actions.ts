"use server";

import { revalidatePath } from "next/cache";
import type { Market } from "@lavion/schema";
import { issueDownloadToken } from "@/lib/download-token";
import { getGuide } from "@/lib/guides";
import { createLead } from "@/lib/leads";

export type DownloadState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ready"; href: string; title: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function requestGuideAction(
  _prev: DownloadState,
  formData: FormData,
): Promise<DownloadState> {
  const market = String(formData.get("market") ?? "") as Market;
  const slug = String(formData.get("slug") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (name.length < 2) return { status: "error", message: "Please give us a name." };
  if (!EMAIL.test(email))
    return { status: "error", message: "That email address does not look right." };

  const guide = await getGuide(market, slug);
  if (!guide) return { status: "error", message: "That guide is no longer available." };

  const token = issueDownloadToken(market, slug);
  if (!token) {
    // Fails closed, like the admin queue: a missing signing secret must not
    // quietly turn the gate into an open door.
    return {
      status: "error",
      message: "Downloads are temporarily unavailable. Please try again shortly.",
    };
  }

  await createLead({
    kind: "guide",
    channel: "form",
    market,
    name,
    email,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    guideSlug: slug,
    guideTitle: guide.title,
  });

  revalidatePath("/admin/leads");

  return {
    status: "ready",
    title: guide.title,
    href: `/api/guides/${market}/${slug}?t=${encodeURIComponent(token)}`,
  };
}
