import { NextResponse } from "next/server";
import type { Market } from "@lavion/schema";
import { verifyDownloadToken } from "@/lib/download-token";
import { buildGuidePdf } from "@/lib/guide-pdf";
import { getGuide } from "@/lib/guides";

/**
 * Streams a guide as PDF, but only to someone who passed the form gate.
 *
 * The token is short-lived and bound to this market and slug, so the URL
 * cannot be shared around as a way to skip giving contact details.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ market: string; slug: string }> },
) {
  const { market, slug } = await params;
  const token = new URL(request.url).searchParams.get("t");

  if (!verifyDownloadToken(market, slug, token)) {
    return NextResponse.json(
      { error: "This download link has expired. Please request the guide again." },
      { status: 403 },
    );
  }

  const guide = await getGuide(market as Market, slug);
  if (!guide) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const pdf = await buildGuidePdf(guide, market as Market);
  const filename = `lavion-luxe-${market}-${slug}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.length),
      // Gated and personal to one request — never cache it anywhere.
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
