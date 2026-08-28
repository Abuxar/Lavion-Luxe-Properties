# Lavion Luxe Properties

Luxury property platform for the **United Kingdom, United Arab Emirates and Pakistan** — a hybrid of a developer showcase, a multivendor marketplace and an aggregator portal.

Implementation plan: [Lavion Luxe Build Plan](https://claude.ai/code/artifact/1dd4f156-fdf4-49e0-8b6e-4514d91fbf37)

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router, Cache Components/PPR), React 19, Tailwind 4 |
| Motion | GSAP + Lenis — **brand surfaces only** |
| API | Node 24, Express 5, Mongoose |
| Data | MongoDB Atlas Flex |
| Media | Cloudinary via a custom `next/image` loader |
| Hosting | Vercel (web) · Hostinger KVM4 (API, later phase) |

## Layout

```
apps/web       Next.js frontend        → Vercel
apps/api       Express REST API        → KVM4, Docker
packages/schema  Zod domain model, publish gates, jurisdiction rules
```

`packages/schema` is the single source of truth. Feed ingestion, the submission
form, the admin review screen and the public API all validate the same shape.

## Getting started

```bash
npm install
npm run build --workspace @lavion/schema   # web and api both consume dist/
cp .env.example .env

npm run dev                                 # all workspaces via turbo
```

The web app runs standalone: when the API is unreachable it falls back to a
sample inventory set, so the UI is always workable.

## Three decisions worth knowing before you edit

**1 · Motion is scoped by route, not by convention.**
`MotionProvider` dynamically imports GSAP and Lenis and is mounted only by
brand surfaces (`/[market]`). Search results and listing detail pages ship
**zero** motion chunks — verified against the build output. These are the pages
judged on LCP and INP, and they are the ones that have to rank. Don't add the
provider to a shared layout.

**2 · Compliance is a publish gate, not a form field.**
`evaluatePublishGates()` in `packages/schema` is a precondition on the
transition into `published`:

- **UAE** — a DLD (Trakheesi) advertising permit number is required, and
  permits *expire*, so `workers/permit-revalidation.ts` pulls lapsed listings
  back out of `published` on a schedule. Advertising without a live permit is a
  RERA violation.
- **UK** — NTSELAT Material Information Part A blocks; Part B warns.
- **Pakistan** — society approval warns and marks the listing unverified.

**3 · Vercel never connects to Atlas.**
All reads go through the Express API, which holds one long-lived pool. Atlas
Flex bursts to roughly 500 ops/sec, so `GET /metrics` exposes a live ops/sec
sample — that number is the M10 migration trigger. Application logs go to disk,
never to Mongo, to protect the ~5 GB storage ceiling.

## Environment variables

No env file is committed to this repo — not even a template. Create `.env`
locally (it is gitignored) and set the same values in the Vercel dashboard.

**Web — needed now**

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for metadata, sitemap and robots |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud for the `next/image` loader |
| `API_BASE_URL` | Backend origin. Unset in phase 1 — the sample fallback is used |
| `ADMIN_PASSPHRASE` | Review-queue access, 8+ chars. **Unset seals the queue** |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store for photo upload (auto-set by the CLI) |

**API — later phase, not deployed yet**

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | Atlas connection string |
| `MONGO_MAX_POOL` | Pool cap. Keep conservative (10) against a shared tier |
| `PORT` / `NODE_ENV` / `LOG_LEVEL` | Runtime basics |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Auth signing keys |
| `PERMIT_CHECK_INTERVAL_MS` | How often lapsed UAE permits are swept |

## F06 — admin-gated submissions

Public submission at `/[market]/submit`, review queue at `/admin`.

The form is market-aware: a Dubai submission asks for the DLD permit (and, if
off-plan, developer, escrow and completion date); a UK one asks for Material
Information, with lease fields appearing only for leasehold; Pakistan asks for
society approval. Each section says *why* it is needed, and the submitter is
told at submit time what will hold the listing in review.

Nothing self-publishes. `approveSubmission()` re-runs `evaluatePublishGates()`
server-side, so a listing failing a blocking gate cannot be published even by a
crafted request — the disabled button is the courtesy, not the control.

### Admin-entered listings

`/admin/new` publishes directly to any of the three markets — full details,
location (with optional lat/lng), amenities and photos. Admin entries go
through the identical Zod schema, mapper and publish gate as agency
submissions.

### Photo upload

Both the admin form and the public submission form take photos straight from
the device. A plain `accept="image/*"` file input is what makes this work on a
phone — iOS and Android surface Camera, Photo Library and Files from the same
control, so no separate camera path is needed. Desktop adds drag-and-drop.

Files are **downscaled in the browser** (max 2000px, JPEG q0.82) before upload.
A phone photo is routinely 3–8 MB at ~4000px; a listing hero never renders
above ~2000px, so shipping the original wastes the seller's mobile data, our
storage and the viewer's LCP.

Upload goes **browser → Vercel Blob directly** via a short-lived token from
`/api/upload`, so the file never passes through a Server Action and the body
limit never applies. Store: `lavion-media` (public access — property photos are
served on public pages, and private access would mean slow delivery and high
egress). If `BLOB_READ_WRITE_TOKEN` is absent the uploader falls back to an
inline data URL so the form still works.

The first image is the hero and the search thumbnail; images can be reordered
and removed. A collapsed "paste image URLs" field remains for Cloudinary IDs
or external URLs once that account is connected.

### Compliance override

A blocked listing can be published anyway, from either the review page or the
create form. It requires an explicit tick plus a written reason, checked
server-side — a bypass cannot happen from a stray click or a replayed request.

Overriding does **not** make an advert lawful. A Dubai listing published
without a live DLD permit is still a RERA violation. The override exists so a
bypass is attributable and, above all, findable: `complianceOverride` records
who, why, when, and exactly which gate codes were skipped. Overridden listings
are counted on the queue, badged in the list, and flagged on the review page —
use `overriddenListings()` as the cleanup list before going live.

`/admin` is `noindex`, disallowed in robots.txt, and never cached. Access is a
single shared passphrase from `ADMIN_PASSPHRASE`; if unset the queue **fails
closed**. This is a phase-1 placeholder, not the RBAC in the plan.

## Current phase

**Phase 1 — frontend only.** The site is live and runs with **no backend**:
`apps/web` falls back to a built-in sample inventory whenever the API is
unreachable, so every page renders without a database.

Live: **https://lavion-luxe-properties.vercel.app** — one Vercel project,
Root Directory `apps/web`, auto-deploying on push to `main`.

| | Now | Later |
|---|---|---|
| Hosting | Vercel Hobby | Vercel Pro |
| Data | none (sample fallback) | Atlas free (M0) → Atlas Flex |
| API | none | Route Handlers on Vercel → Express on KVM4 |

`apps/api` is written and typechecks, but is **not deployed**. It is the
KVM4 target for a later phase.

### Wiring up data when Atlas arrives

`src/lib/listings.ts` is the only file that needs to change. It already has
the fallback seam — point `getListings()` / `getListing()` at Next.js Route
Handlers under `src/app/api/`, and keep the `use cache` + `cacheLife` wrappers
as they are.

On Atlas free (M0), cache the Mongo client at module scope and reuse it across
invocations rather than connecting per request — M0 is shared and connection
limited, and Fluid Compute reuses function instances, so a module-level client
is the right pattern.

## Deploying

Push to `main` — Vercel builds and deploys automatically.

```bash
vercel deploy --prod --scope abuxar   # manual production deploy
```

The build compiles `@lavion/schema` first (see `apps/web` build script), so the
deploy is self-contained from Root Directory `apps/web`.

**When the API moves to KVM4:**

```bash
docker compose up -d --build
```

Container CPU and memory limits in `docker-compose.yml` are not optional — KVM4
hosts other projects, and a spike here must not starve them. Docker owns
supervision; there is no PM2 inside the container.

## Not legal advice

Jurisdiction rules in `packages/schema/src/compliance-rules.ts` carry their
source and a `lastReviewedAt` date. They are researched starting points and
require sign-off from qualified counsel in each jurisdiction before being shown
to users. Thresholds and tax rates move with each budget cycle.
