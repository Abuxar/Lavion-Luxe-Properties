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
