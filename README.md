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
| Hosting | Vercel (web) · Hostinger KVM4 (API, Docker) |

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

## Deploying

**Web** → Vercel. Set `API_BASE_URL`, `NEXT_PUBLIC_SITE_URL`,
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`. Pin the function region close to the KVM4
region; every SSR request crosses that link.

**API** → KVM4:

```bash
docker compose up -d --build
```

Container CPU and memory limits are set in `docker-compose.yml` and are not
optional — KVM4 hosts other projects, and a spike here must not starve them.
Docker owns supervision; there is no PM2 inside the container.

## Not legal advice

Jurisdiction rules in `packages/schema/src/compliance-rules.ts` carry their
source and a `lastReviewedAt` date. They are researched starting points and
require sign-off from qualified counsel in each jurisdiction before being shown
to users. Thresholds and tax rates move with each budget cycle.
