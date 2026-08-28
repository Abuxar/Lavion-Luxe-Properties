import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

/**
 * Token endpoint for direct browser -> Blob uploads.
 *
 * The file never passes through this function: the browser asks for a
 * short-lived token, then uploads straight to Blob storage. That sidesteps the
 * Server Action body limit entirely, which matters because a phone photo is
 * routinely 3-8 MB and a listing carries twenty of them.
 */

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Public submissions may upload too, otherwise a seller cannot include
        // photos. Uploads are size- and type-capped, and land under a prefix
        // that reflects who sent them.
        const admin = await isAdmin();

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif",
            "image/heic",
            "image/heif",
          ],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ admin, pathname }),
        };
      },
      onUploadCompleted: async () => {
        // Nothing to persist yet — the listing records the returned URL when
        // the form is submitted. This becomes an Atlas write later.
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "upload_failed" },
      { status: 400 },
    );
  }
}
