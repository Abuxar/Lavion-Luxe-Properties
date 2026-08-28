"use server";

import { revalidatePath } from "next/cache";
import type { Market } from "@lavion/schema";
import { describeQuery, parseQuery } from "@/lib/search";
import { saveSearch } from "@/lib/saved-searches";

export type SaveState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ok"; message: string; label: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function saveSearchAction(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const market = String(formData.get("market") ?? "") as Market;
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const qs = String(formData.get("qs") ?? "");

  if (!EMAIL.test(email)) {
    return { status: "error", message: "That email address does not look right." };
  }

  const query = parseQuery(Object.fromEntries(new URLSearchParams(qs)));
  const label = describeQuery(query, market);

  const { duplicate } = await saveSearch({
    market,
    email,
    name: name || undefined,
    query,
    label,
  });

  revalidatePath("/admin/alerts");

  return {
    status: "ok",
    label,
    message: duplicate
      ? "You are already following this search."
      : "Saved. We will be in touch when new properties match.",
  };
}
