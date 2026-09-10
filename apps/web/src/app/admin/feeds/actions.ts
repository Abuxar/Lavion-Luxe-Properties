"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { FeedRunSummary, Market } from "@lavion/schema";
import { isAdmin } from "@/lib/admin-auth";
import {
  createFeedSource,
  deleteFeedSource,
  fetchFeedText,
  getFeedSource,
  runFeed,
  setFeedActive,
} from "@/lib/feeds";

export type FeedState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ok"; message: string }
  | { status: "run"; message: string; summary: FeedRunSummary; dryRun: boolean };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function createSourceAction(
  _prev: FeedState,
  formData: FormData,
): Promise<FeedState> {
  if (!(await isAdmin())) return { status: "error", message: "Not signed in." };

  const agencyName = str(formData, "agencyName");
  if (agencyName.length < 2)
    return { status: "error", message: "Give the agency a name." };

  const url = str(formData, "url");
  if (url && !/^https?:\/\//i.test(url))
    return { status: "error", message: "Feed URL must start with http:// or https://" };

  // Column mapping arrives as "ourField=theirColumn" per line.
  const mapping: Record<string, string> = {};
  for (const line of str(formData, "mapping").split("\n")) {
    const [ours, theirs] = line.split("=").map((x) => x?.trim());
    if (ours && theirs) mapping[ours] = theirs;
  }

  await createFeedSource({
    agencyName,
    market: str(formData, "market") as Market,
    format: str(formData, "format") === "json" ? "json" : "csv",
    url: url || undefined,
    mapping,
    autoPublish: formData.get("autoPublish") === "on",
  });

  revalidatePath("/admin/feeds");
  return { status: "ok", message: `Added ${agencyName}.` };
}

export async function runFeedAction(
  _prev: FeedState,
  formData: FormData,
): Promise<FeedState> {
  if (!(await isAdmin())) return { status: "error", message: "Not signed in." };

  const source = await getFeedSource(str(formData, "id"));
  if (!source) return { status: "error", message: "That feed source no longer exists." };

  const dryRun = formData.get("dryRun") === "on";
  const pasted = str(formData, "pasted");

  let text = pasted;
  if (!text) {
    if (!source.url)
      return {
        status: "error",
        message: "This source has no URL, so paste the feed contents instead.",
      };
    try {
      text = await fetchFeedText(source.url);
    } catch (e) {
      return {
        status: "error",
        message: e instanceof Error ? `Could not fetch the feed: ${e.message}` : "Fetch failed",
      };
    }
  }

  const summary = await runFeed(source, text, { dryRun });

  updateTag("listings");
  revalidatePath("/admin/feeds");
  revalidatePath("/admin");

  return {
    status: "run",
    dryRun,
    summary,
    message: dryRun
      ? `Preview: ${summary.rows.length} rows read, ${summary.rejected} rejected.`
      : `${summary.created} created, ${summary.updated} updated, ${summary.rejected} rejected.`,
  };
}

export async function toggleSourceAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  await setFeedActive(String(formData.get("id") ?? ""), formData.get("active") === "true");
  revalidatePath("/admin/feeds");
}

export async function deleteSourceAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  await deleteFeedSource(String(formData.get("id") ?? ""));
  revalidatePath("/admin/feeds");
}
