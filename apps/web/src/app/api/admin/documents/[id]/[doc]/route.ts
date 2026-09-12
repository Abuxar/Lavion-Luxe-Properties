import { readDocument } from "@/lib/documents";
import { requireStaff } from "@/lib/session";
import { getSubmission } from "@/lib/submissions";

/**
 * The only way to read a seller's document back.
 *
 * Staff session required, checked here rather than trusted from the page that
 * linked here — the encrypted bytes sit in a public store, and this route is
 * what keeps them unreadable to everyone else.
 *
 * The pathname is never taken from the request: it is looked up on the
 * submission, so a crafted URL cannot pull an arbitrary object out of the
 * store. A missing document and a missing session are both a plain 404 and
 * 401 respectively, with nothing else said.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/admin/documents/[id]/[doc]">,
): Promise<Response> {
  if (!(await requireStaff())) {
    return new Response("Not permitted", { status: 401 });
  }

  const { id, doc } = await ctx.params;
  const submission = await getSubmission(id);
  const record = submission?.documents?.find((d) => d.id === doc);
  if (!record) return new Response("Not found", { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await readDocument(record.pathname);
  } catch {
    return new Response("That document could not be opened.", { status: 502 });
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": record.type,
      "Content-Length": String(bytes.length),
      // inline so the admin can read it in the page; the filename is the
      // seller's own, quoted, in case it contains spaces.
      "Content-Disposition": `inline; filename="${record.name.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
