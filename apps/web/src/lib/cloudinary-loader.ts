"use client";

/**
 * Custom next/image loader.
 *
 * Transformation runs at Cloudinary, so we keep the next/image ergonomics
 * (responsive srcset, lazy loading, no layout shift) without paying Vercel to
 * re-optimize images Cloudinary has already optimized. On a portal serving 20+
 * photos per listing across every gallery view, that difference is the whole
 * image bill.
 *
 * f_auto gives AVIF/WebP by negotiation; q_auto adapts quality to the
 * viewer's connection, which matters most on mid-range Android over 4G.
 */
export default function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  // Local/dev assets and absolute URLs pass through untouched.
  if (!cloud || src.startsWith("http") || src.startsWith("/")) return src;

  const params = [
    "f_auto",
    `q_${quality ?? "auto"}`,
    `w_${width}`,
    "c_limit",
    "dpr_auto",
  ].join(",");

  return `https://res.cloudinary.com/${cloud}/image/upload/${params}/${src}`;
}
