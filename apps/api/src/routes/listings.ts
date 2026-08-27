import { Router } from "express";
import {
  ListingInput,
  ListingQuery,
  evaluatePublishGates,
  evaluateEligibility,
  toSqft,
} from "@lavion/schema";
import { ListingModel } from "../models/listing.model.js";
import { countOp } from "../db.js";
import { logger } from "../logger.js";

export const listings = Router();

/** Statuses whose pages stay live and indexable. Sold/let keep their URL. */
const PUBLIC_STATUSES = ["published", "sold", "let"];

/* ---------- search ---------- */

listings.get("/", async (req, res) => {
  const parsed = ListingQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_query", issues: parsed.error.issues });
  }
  const q = parsed.data;

  const filter: Record<string, unknown> = {
    market: q.market,
    status: "published",
  };
  if (q.transaction) filter.transaction = q.transaction;
  if (q.category?.length) filter.category = { $in: q.category };
  if (q.city) filter["location.city"] = q.city;
  if (q.locality) filter["location.locality"] = q.locality;
  if (q.offPlan !== undefined) filter.offPlan = q.offPlan;
  if (q.minPrice || q.maxPrice) {
    filter["price.amount"] = {
      ...(q.minPrice ? { $gte: q.minPrice } : {}),
      ...(q.maxPrice ? { $lte: q.maxPrice } : {}),
    };
  }
  if (q.minBeds || q.maxBeds) {
    filter.bedrooms = {
      ...(q.minBeds ? { $gte: q.minBeds } : {}),
      ...(q.maxBeds ? { $lte: q.maxBeds } : {}),
    };
  }
  // UAE-only: listings that clear the Golden Visa threshold.
  if (q.goldenVisaEligible) {
    filter.market = "ae";
    filter.tenure = "freehold";
    filter["location.freeholdZone"] = true;
    filter["price.amount"] = {
      ...(typeof filter["price.amount"] === "object" ? (filter["price.amount"] as object) : {}),
      $gte: 2_000_000,
    };
  }

  const sort: Record<string, 1 | -1> =
    q.sort === "price_asc"
      ? { "price.amount": 1 }
      : q.sort === "price_desc"
        ? { "price.amount": -1 }
        : q.sort === "beds_desc"
          ? { bedrooms: -1 }
          : { publishedAt: -1 };

  countOp();
  // .lean() — we never mutate these, and hydrating documents for a 24-item
  // result page is pure overhead on a shared-tier cluster.
  const [items, total] = await Promise.all([
    ListingModel.find(filter)
      .sort(sort)
      .skip((q.page - 1) * q.perPage)
      .limit(q.perPage)
      .lean(),
    ListingModel.countDocuments(filter),
  ]);

  res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.json({ items, total, page: q.page, perPage: q.perPage });
});

/* ---------- single listing ---------- */

listings.get("/:market/:slug", async (req, res) => {
  countOp();
  const doc = await ListingModel.findOne({
    market: req.params.market,
    slug: req.params.slug,
    status: { $in: PUBLIC_STATUSES },
  }).lean();

  if (!doc) return res.status(404).json({ error: "not_found" });

  const eligibility = evaluateEligibility(doc as never);
  res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.json({ listing: doc, eligibility });
});

/* ---------- create / submit (F06) ---------- */

listings.post("/", async (req, res) => {
  const parsed = ListingInput.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_listing", issues: parsed.error.issues });
  }
  const input = parsed.data;

  // Normalise area on write so we never convert at read time.
  input.area.canonicalSqft = toSqft(input.area.value, input.area.unit);

  // Everything submitted lands in review. Nothing self-publishes.
  const status = input.source === "self_submitted" ? "pending_review" : input.status;

  countOp();
  const created = await ListingModel.create({
    ...input,
    status,
    priceHistory: [{ amount: input.price.amount, at: new Date() }],
  });

  res.status(201).json({ listing: created, gates: evaluatePublishGates(input) });
});

/* ---------- publish transition: the gate ---------- */

listings.post("/:id/publish", async (req, res) => {
  countOp();
  const doc = await ListingModel.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "not_found" });

  const gates = evaluatePublishGates(doc.toObject() as never);

  // The gate is a precondition on the transition, not advice to an admin.
  if (!gates.canPublish) {
    logger.warn(
      { listingId: doc.id, failures: gates.failures.map((f) => f.code) },
      "publish blocked by compliance gate",
    );
    return res.status(422).json({ error: "compliance_gate_failed", ...gates });
  }

  doc.status = "published";
  doc.publishedAt = new Date();
  await doc.save();

  res.json({ listing: doc, gates });
});

/* ---------- gate preview for the admin queue ---------- */

listings.get("/:id/gates", async (req, res) => {
  countOp();
  const doc = await ListingModel.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ error: "not_found" });
  res.json(evaluatePublishGates(doc as never));
});
