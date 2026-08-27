import type { NextConfig } from "next";

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
        source: "/admin",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
