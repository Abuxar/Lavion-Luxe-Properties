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
}
