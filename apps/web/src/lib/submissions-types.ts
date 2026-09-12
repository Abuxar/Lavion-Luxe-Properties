import type { ListingInput } from "@lavion/schema";

export type SubmissionStatus = "pending_review" | "approved" | "rejected";

export interface Submission {
  id: string;
  submittedAt: string;
  submitterName: string;
  submitterEmail: string;
  status: SubmissionStatus;
  /** Why an admin rejected it — shown back to the submitter. */
  reviewNote?: string;
  listing: ListingInput;
  /**
   * Ownership paperwork the seller attached — title deed, NOC, identity.
   *
   * ADMIN ONLY. It lives on the submission, never on the listing, so it cannot
   * reach the public site: `publishedListings` maps the listing alone. The
   * files themselves are encrypted in the Blob store and served only through
   * the staff-gated route; this record holds no URL, only the pathname the
   * route resolves.
   */
  documents?: SubmissionDocument[];
}

export type DocumentStatus = "pending" | "verified" | "rejected";

export interface SubmissionDocument {
  id: string;
  /** The seller's own filename, shown to the admin. */
  name: string;
  /** Content type, restricted to PDF and images at upload. */
  type: string;
  size: number;
  /** Where the encrypted bytes live. Not a URL — the admin route resolves it. */
  pathname: string;
  uploadedAt: string;
  status: DocumentStatus;
  /** Why it was rejected, or a note the admin left when verifying. */
  note?: string;
  checkedBy?: string;
  checkedAt?: string;
}
