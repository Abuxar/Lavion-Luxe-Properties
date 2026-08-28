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
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob — photo upload **and** the submission queue |

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

## Market hero photography

Each market hero carries a photograph of its landmark: the Palace of
Westminster in fog, the Dubai skyline above cloud at sunrise, and the Pakistan
Monument lit at dusk.

All three are cropped to an **identical 16:9 and served at 1600x900** WebP
(17–61 KB each), so switching market does not change the hero's height or
framing. Sources are pre-processed with ImageMagick rather than resized at
request time — the custom `next/image` loader passes local paths straight
through, so the file on disk is the file that ships.

A light blur plus a left-weighted scrim keeps the headline legible over
photography without dimming the image into mud, and the bottom of the scrim
fades to `--color-paper` so the hero joins the next section rather than ending
on a seam.

**The hero commits to a dark treatment in both themes.** A photograph cannot
carry dark type in light mode and light type in dark mode without a second crop
and a second scrim, so the scrim always darkens and hero type is always light —
which is why those few colours are literals rather than theme tokens.

**Hero content uses a CSS-only entrance (`data-rise`), never `data-reveal`.**
`data-reveal` sets `opacity: 0` until GSAP mounts, which is fine below the fold
but would make the headline — the LCP element and the whole message — depend on
JavaScript.

## Search and F01 saved searches

`/[market]/search` is now a real search: area, city, property type, price
range, beds, baths, off-plan, Golden Visa eligibility, five sort orders and
pagination. Filters drive the **URL, not local state**, so a result set is
shareable and the back button behaves — and every filter combination
canonicalises to the unfiltered page, because faceted URLs are infinite and
letting them into the index is how a portal loses its crawl budget.

Facet options are derived from live inventory, so a filter never offers a
combination with nothing behind it. Number fields commit on blur or Enter
rather than per keystroke, so typing a price does not push six history entries.

**One query model.** `lib/search.ts` owns parsing, serialising, filtering and
sorting, and both the search page and the saved-search matcher call the same
`matches()` predicate. If they each grew their own filter logic they would
drift, and a subscriber would be alerted about a property their own search
excludes. Verified identical output for both paths.

### F01 — scope stated plainly

Subscriptions and matching are built. **Email dispatch is not** — it needs a
provider and a scheduler, neither of which exists yet. Rather than ship a queue
that silently sends nothing, matches surface in `/admin/alerts` so the team can
act on them by hand today; dispatch later becomes a layer on top, not a
rewrite. The admin page says so on the page itself, not just in this file.

Everything already listed when someone subscribes is recorded as seen, so the
first batch is genuinely *new since you subscribed* rather than the whole
catalogue. **Demand by area** ranks what buyers are asking for — an area with
subscribers and zero matching inventory is the clearest signal of what to
onboard next.

## F02 / F08 — leads

Until now the site could not capture a lead: "Request a viewing" was an inert
button and the WhatsApp link pointed at a placeholder number.

**F08 — territory routing.** `routeToAgent()` matches locality, then city, then
market, so a Dubai Marina enquiry reaches the Marina specialist and nothing is
ever unrouted. The listing page names the assigned agent and its WhatsApp link
uses that agent's real number.

**F02 — valuation.** `/[market]/valuation` returns an indicative range computed
from comparable asking prices per sq ft, then books a real appraisal. The
estimator is deliberately conservative: the spread widens as the comparable
sample thins (±12% at 5+, ±25% at 2), the page states the comparable count and
whether the basis was locality, city or market, and it returns **null rather
than inventing a number** when there is nothing to compare. It says plainly
that these are asking prices, not achieved sale prices.

**Inbox** at `/admin/leads` — enquiries, viewings and valuations in one
collection with a `kind` discriminator, already routed, with new/contacted/
closed states. Persisted through `blob-collection.ts`, extracted from the
submission store so both share one load/save implementation.

## F04 / F05 / F10 — the investor layer

`/[market]/guides` and `/[market]/guides/[slug]`. Six guides, two per market.

**Guides render from rule data, not from prose.** A guide is editorial framing
wrapped around one or more `ComplianceRule` records, so when the Golden Visa
threshold or a UK surcharge moves you edit one record and every guide citing it
updates. Each rule renders its **source authority (linked), the date it came
into force, and the date it was last reviewed** — and a guide past its review
interval says so on the page. Undated legal content is worse than none.

**F04 makes the rule computable.** The Golden Visa guide does not just describe
the AED 2M threshold — it queries live inventory for freehold listings in a
designated zone at or above it, and shows them. The same predicate powers
`/ae/search?goldenVisaEligible=true`. Verified it discriminates: 2 of 2 AE
listings qualify, 0 of 2 UK and 0 of 3 PK.

Every guide carries a disclaimer naming the right professional per
jurisdiction. The content explains how rules work; it does not recommend
investments, which is where regulated advice begins.

## F03 — area guides (programmatic SEO)

`/[market]/for-sale/[city]` and `/[market]/for-sale/[city]/[locality]`, derived
from live inventory rather than a hand-maintained list. Each guide carries real
substance — matching listings, price statistics computed from them (median,
range, median per sq ft), available types, and an internal link mesh to sibling
areas, the parent city and the market guide.

### Indexability threshold — the crawl-budget rule

The same generator that creates the growth engine can create thousands of
near-empty URLs, and index bloat is the most common way a new portal's SEO
stalls. So a guide **earns** indexation:

```
MIN_LISTINGS_FOR_INDEX = 2   // src/lib/areas.ts — raise as supply grows
```

Below the threshold a guide still renders and is still crawled, but is marked
`noindex, follow` so links keep propagating while the thin page stays out of
the index. **The sitemap is driven by the same flag** — submitting a URL that
carries `noindex` wastes crawl budget and sends a contradictory signal.

The number is deliberately low for the seed inventory. A real portal wants it
around 5–10; review it rather than leaving it at whatever made the demo look
full.

### hreflang

Set at launch, not retrofitted — three market sections sharing one language is
exactly the configuration that gets miscrawled, and it is very hard to unwind
after Google has indexed a broken structure. Codes come from `MARKETS[m].locale`
so they are real BCP-47: **`en-GB`, not `en-UK`** — the UK's region subtag is
GB, and an invalid hreflang is silently ignored.

### Sold and let listings

A listing page that has accumulated rankings for months is an asset. It keeps
its URL, is badged sold or let, and surfaces live alternatives scored by
locality, city and bed count — rather than 404ing and throwing the authority
away. "What did this sell for" is high-intent traffic competitors discard.

## Current phase

**Phase 1 — frontend only.** The site is live and runs with **no backend**:
`apps/web` falls back to a built-in sample inventory whenever the API is
unreachable, so every page renders without a database.

The submission queue persists to **Vercel Blob** as a single JSON document
(`queue/submissions.json`) — the same store that backs photo upload. A
module-level Map does not work on serverless: instances come and go per
request, so a listing created on one instance is invisible to the next read.
That is a correctness failure on every request, not a cold-start caveat.

Known limit: writes are read-modify-write, so two admins acting in the same
instant can clobber each other. Fine for a small internal queue; it disappears
when this moves to Atlas and each mutation becomes one document update.

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
