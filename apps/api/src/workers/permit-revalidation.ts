import { ListingModel } from "../models/listing.model.js";
import { logger } from "../logger.js";

/**
 * UAE advertising permits EXPIRE, so compliance is not a one-time check at
 * approval. Without this worker, a listing that was lawful when approved
 * silently becomes an unlawful advert.
 *
 * Runs against the `ae_permit_expiry_watch` partial index, so it touches only
 * published AE listings rather than scanning the collection.
 */

const INTERVAL_MS = Number(process.env.PERMIT_CHECK_INTERVAL_MS ?? 60 * 60 * 1000);

export async function revalidatePermits(now: Date = new Date()): Promise<number> {
  const res = await ListingModel.updateMany(
    {
      market: "ae",
      status: "published",
      "compliance.ae.permitExpiry": { $lt: now },
    },
    { $set: { status: "expired" } },
  );

  if (res.modifiedCount > 0) {
    logger.warn(
      { count: res.modifiedCount },
      "unpublished AE listings with lapsed advertising permits",
    );
  }
  return res.modifiedCount;
}

/** Listings whose permit lapses inside the window — for agency chase-up. */
export async function permitsExpiringSoon(days = 7) {
  const until = new Date();
  until.setDate(until.getDate() + days);
  return ListingModel.find({
    market: "ae",
    status: "published",
    "compliance.ae.permitExpiry": { $gte: new Date(), $lt: until },
  })
    .select("slug title ownerAgencyId compliance.ae.permitExpiry")
    .lean();
}

export function startPermitRevalidation() {
  revalidatePermits().catch((err) => logger.error({ err }, "permit revalidation failed"));
  const t = setInterval(() => {
    revalidatePermits().catch((err) => logger.error({ err }, "permit revalidation failed"));
  }, INTERVAL_MS);
  t.unref();
  logger.info({ intervalMs: INTERVAL_MS }, "permit revalidation worker started");
  return t;
}
