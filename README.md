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
| `RESEND_API_KEY` | Enables alert email. Unset = dispatch reports skipped |
| `EMAIL_FROM` | Sender, default `Lavion Luxe <noreply@lavionluxe.com>` |
| `EMAIL_REPLY_TO` | Optional reply-to |
| `ADMIN_EMAIL` | Seed super-admin address, default `admin@lavionluxe.com` |

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

## Interactive layer

**Gallery + lightbox.** Listing pages previously rendered `media[0]` only —
every photo a seller uploaded after the first was invisible. Now a full gallery
with a thumbnail strip and a lightbox: arrow keys, Escape, focus returned to
the opener on close, body scroll locked while open. No animation library; this
is a money page judged on INP.

**Shortlist.** Save any property from the card or the detail page, compare them
side by side at `/[market]/shortlist`. Kept in `localStorage` rather than behind
an account, because asking someone to register before saving a second property
is how you lose them. Every read is wrapped in try/catch — private windows and
blocked site data throw on access rather than returning empty. The compare
table computes **price per sq ft**, which is the number that actually separates
two properties at similar asking prices and which no listing states.

**Mortgage and yield calculator** on every listing. Deposit, rate and term
sliders with live amortisation, plus gross yield and rent-minus-repayment.
Defaults differ per market because a 25% deposit is normal in Dubai and unusual
in London. Gross yield only, and it says so — net needs service charge, agency
fees and voids that vary per property.

**Theme control.** Light and dark, nothing else — a two-state switch, not a
three-way with an "auto" option to pick. The system preference still chooses
the *initial* theme on a first visit so nobody lands in the wrong one, but once
a visitor chooses it sticks. An inline pre-paint script stamps the theme before
first paint so a saved choice does not flash on every navigation; the script
and the toggle read the same two sources in the same order, so they cannot
disagree about what the initial theme is.

**Error boundaries.** `error.tsx` and `not-found.tsx` — previously an
unexpected throw showed the bare Next.js screen with no chrome and no way back.

## F09 — monetization

Tiers, promotion pricing, commission arithmetic and paid placement are built.
**Collection is not.** Stripe needs a merchant account per market, does not
operate in Pakistan at all, and restricts Connect marketplace payouts in the
UAE — so promotions are recorded `paid: false` and reconciled by hand. The
arithmetic living in `packages/schema/src/monetization.ts` rather than inside a
checkout flow that does not exist means it is testable today and the payment
rail becomes a thin adapter later.

Three tiers (Starter / Professional / Enterprise) with listing allowances,
included promotions, commission rates and per-market closing fees. Promotion
pricing is per-market for three placement tiers. `/admin/revenue` shows booked
promotion revenue **per currency** — never summed across AED, GBP and PKR,
which would be a meaningless number — plus what a completed sale earns at each
tier.

### Two rules about paid placement

**It is disclosed.** A promoted listing carries a `Featured` badge everywhere
it appears. UK consumer-protection rules require paid promotion to be
identifiable, and every serious portal labels it.

**It never overrides an explicit sort.** Promotion lifts a listing in the
default order only. Once a visitor has asked for cheapest-first, silently
reordering that for money is the deceptive pattern — their sort wins. Verified:
under `sort=price_asc` the promoted listing sorts last, on price, like
everything else.

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

### F01 — dispatch

Subscriptions, matching and **sending** are all built. Dispatch is written
against a provider interface rather than a vendor SDK, and talks to Resend over
plain fetch — their send API is one POST, so a package that would sit unused
until a key exists is not worth the dependency.

Set `RESEND_API_KEY` and it sends; leave it unset and every subscription comes
back `skipped` rather than a success nobody received. The admin page reflects
whichever is true rather than a hardcoded warning.

A subscription is acknowledged **only after the provider accepts its email**.
Marking first would mean an outage silently swallows the one batch a subscriber
was waiting for, and nothing would ever resend it.

Still no scheduler, so runs are triggered from `/admin/alerts`. A cron calling
`dispatchSavedSearchAlerts()` is the only piece left.

Emails carry a plain-text alternative, no external assets, inline styles and
table layout — email clients are not browsers — and every interpolated value is
escaped.

Everything already listed when someone subscribes is recorded as seen, so the
first batch is genuinely *new since you subscribed* rather than the whole
catalogue. **Demand by area** ranks what buyers are asking for — an area with
subscribers and zero matching inventory is the clearest signal of what to
onboard next.

## Accounts and RBAC

Replaces the single shared passphrase, which was always marked a placeholder:
one secret, no identity, no scoping, and no way to remove one person's access
without changing everyone's.

**Roles.** `super_admin` is staff and sees everything. `agency_admin` and
`agent` are scoped to one agency.

**Passwords** use scrypt from Node's own crypto — memory-hard, no dependency,
salted per user, and no plaintext is ever stored or logged. Sign-in returns the
same message and does roughly the same work whether the account exists or the
password is wrong, because distinguishing them tells an attacker which emails
are registered.

**Sessions** are a signed cookie carrying the user id only. Role and agency are
re-read from the store on every request rather than trusted from the cookie, so
disabling someone or changing their role takes effect immediately instead of
whenever their session happens to expire.

**Scoping lives in one place** (`agency-data.ts`), not in each page. A dashboard
that filters in the component is one forgotten `.filter()` away from showing an
agency a competitor's pipeline. Every scoped query takes the agency id
explicitly and returns nothing when it is missing — failing closed rather than
falling back to "everything". Verified: no cross-agency leakage on listings or
leads, and a valuation request tied to no listing stays with staff.

`/agency` is the agency dashboard — their listings, their enquiries, their tier
allowance. `/agency/new` is self-serve submission. `/admin/team` is where staff
create agencies and users.

### Agency submission

Narrower than the staff form on purpose: no market picker (it comes from the
agency), no publish control, no compliance override. **Nothing self-publishes
whatever the role** — an agency submits and staff review, which is the whole
point of the gated-submission model.

Two controls enforced server-side, not merely hinted at in the UI:

- **The tier allowance.** The dashboard warning is a courtesy; the action
  refuses. Only *live* listings count, so drafts and pending items do not
  consume the quota.
- **The owning agency comes from the session, never the form.** Otherwise an
  agency could file listings under a competitor's name.

### Migrating

The first sign-in seeds a `super_admin` from `ADMIN_PASSPHRASE`, so nobody is
locked out by the change:

| | |
|---|---|
| Email | `ADMIN_EMAIL`, default `admin@lavionluxe.com` |
| Password | the existing `ADMIN_PASSPHRASE` |

The account is created once. Changing the env var afterwards does not silently
reset the password.

## Feed ingestion — the aggregator

`/admin/feeds`. Inventory from agencies who do not manage a dashboard, pulled
from a file they already produce. UK agencies generate portal feeds for
Rightmove and Zoopla today, so asking for the same export is a normal
commercial conversation — and it is the only lawful route. Scraping a
competitor is a terms-of-service and copyright problem that also breaks the
moment they change their markup.

CSV and JSON, with a per-source column mapping (`ourField=theirColumn`) so an
agency never has to rename anything. The CSV reader is hand-rolled to RFC 4180
rather than a `split(",")`: property descriptions routinely contain commas,
escaped quotes and embedded newlines, and those are exactly the rows a naive
parser corrupts.

**Two rules the pipeline is built around.**

*Imports are not a back door.* Every row runs the same publish gates as a
hand-typed listing. A Dubai row without a DLD permit is held in review even
when the source has auto-publish enabled — bulk is precisely where a compliance
bypass would do the most damage. Verified.

*Re-syncing updates rather than duplicates,* matched on the agency's own
`externalRef` and not the slug — slugs derive from the title, so a vendor
editing their headline would otherwise create a copy on every sync. An update
preserves our review decision, any promotion, and appends to price history
rather than overwriting it.

Every run reports per row. "Imported 40 of 60" without saying which twenty
failed is not actionable, and quietly losing a fifth of a catalogue is how a
portal loses the agency. Dry-run previews parse and report without writing.

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
