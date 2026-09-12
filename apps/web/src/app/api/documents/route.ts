import { NextResponse } from "next/server";
import { MAX_BYTES, storeDocument, uploadAllowed } from "@/lib/documents";

/**
 * Seller document upload.
 *
 * Photos go browser -> Blob directly, because they are public by design. A
 * title deed is not: it has to pass through the server so it can be encrypted
 * before anything is written to a public store. That is the whole reason this
 * route exists rather than reusing /api/upload.
 *
 * Open to anyone, because sellers are not signed in when they submit a
 * property — so it is capped by type, by size, and per IP.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!uploadAllowed(ip)) {
    return NextResponse.json(
      { error: "Too many uploads from this connection. Try again shortly." },
      { status: 429 },
    );
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Could not read that upload." }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "No file was sent." }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is over ${Math.round(MAX_BYTES / 1024 / 1024)} MB.` },
      { status: 413 },
    );
  }

  try {
    const result = await storeDocument(file);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result.document, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // storeDocument throws when no encryption key is configured. Saying "not
    // configured" out loud beats storing a deed in the clear.
    return NextResponse.json(
      { error: "Document storage is not configured. Send the papers by email instead." },
      { status: 503 },
    );
  }
}
