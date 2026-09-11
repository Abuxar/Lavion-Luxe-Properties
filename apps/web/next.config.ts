import type { NextConfig } from "next";

/**
 * Content Security Policy.
 *
 * Built from the origins this app actually talks to, not a template. Fonts are
 * self-hosted by next/font at build time, so no Google Fonts origin is needed;
 * Resend is called server-side and never appears here.
 *
 * HONEST LIMIT — script-src carries 'unsafe-inline'. Next streams hydration
 * and Flight payloads through inline <script> tags, so removing it requires a
 * per-request nonce from middleware, which means every page becomes dynamic
 * and the prerendered shells this site is built around stop being cacheable.
 * The policy still blocks the thing that actually matters here: script loaded
 * from an origin we did not list. Treat that as the next hardening step once
 * there is a reason to pay for it, not as a box already ticked.
 */
const BLOB_HOST = "https://*.public.blob.vercel-storage.com";
const CLOUDINARY = "https://res.cloudinary.com";

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Clickjacking: this site has publish and approve buttons behind a session.
  "frame-ancestors 'none'",
  "form-action 'self'",
  `img-src 'self' data: blob: ${CLOUDINARY} ${BLOB_HOST}`,
  `media-src 'self' data: blob: ${CLOUDINARY} ${BLOB_HOST}`,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  // Dev needs eval for React Refresh; production must not have it.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  // Photos upload straight from the browser to Blob storage.
  `connect-src 'self' ${BLOB_HOST}`,
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Cache Components (PPR + `use cache`). A listing page is a mostly-static
  // shell — photos, description, location — wrapped around a few volatile
  // fields (price, status). Whole-page ISR forces one revalidation policy
  // across both; this lets the shell prerender and the volatile parts stream.
  cacheComponents: true,

  // Named profiles so a cacheLife() call reads as intent, not a number.
  // Listing bodies are stable; prices and availability are not — which is
  // exactly why the two are cached separately rather than as one page.
  cacheLife: {
    listing: { stale: 300, revalidate: 900, expire: 86_400 },
    search: { stale: 60, revalidate: 300, expire: 3_600 },
    areaGuide: { stale: 3_600, revalidate: 86_400, expire: 604_800 },
    complianceRule: { stale: 3_600, revalidate: 86_400, expire: 2_592_000 },
  },

  reactCompiler: true,

  images: {
    // Transformation happens at Cloudinary, not in Vercel's optimizer.
    // A portal serves 20+ photos per listing across every gallery view —
    // paying Vercel to redo work Cloudinary already does is the single
    // easiest cost mistake to make here.
    loader: "custom",
    loaderFile: "./src/lib/cloudinary-loader.ts",
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920, 2560],
  },

  experimental: {
    optimizePackageImports: ["gsap", "lucide-react"],
  },

  async redirects() {
    return [
      {
        // The featured-partner page was removed when Lavion Luxe Properties
        // moved to a site of its own. It was live and linked from every market
        // page, so old links land on the market rather than a 404.
        source: "/:market(uk|ae|pk)/partner",
        destination: "/:market",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        // The review queue renders authenticated content and can publish
        // listings. Vercel does vary its cache on the auth cookie, but an
        // admin surface must not depend on that heuristic — state it.
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        // Agency dashboards render scoped, signed-in data — same posture as
        // the staff queue: never cached, never indexed.
        source: "/agency/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        source: "/agency",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        source: "/admin",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        // Static imagery in public/ was served with max-age=0,
        // must-revalidate, so a returning visitor revalidated the hero on
        // every single page view. These files only change on deploy.
        //
        // An hour rather than immutable, deliberately: hero images get
        // replaced under the same filename, and immutable would strand a
        // returning visitor on the old one indefinitely.
        source: "/:dir(hero|samples)/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // frame-ancestors below covers modern browsers; this covers the rest.
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // Nothing here uses these, so deny them outright rather than
            // leaving them available to injected script.
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
