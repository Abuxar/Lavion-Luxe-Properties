import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Facet combinations beyond the defined taxonomy are never indexable —
        // this is the crawl-budget discipline that stops the programmatic
        // landing pages turning into mass thin content.
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          // Facet combinations beyond the taxonomy are never indexable.
          "/*?sort=",
          "/*?page=",
          "/*?minPrice=",
          "/*?maxPrice=",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
