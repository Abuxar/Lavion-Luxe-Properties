/**
 * Brand identity, in one place.
 *
 * The platform is being renamed once the client settles on a name, so every
 * customer-visible mention of it resolves here rather than being typed into a
 * dozen components. Renaming then means setting two environment variables and
 * redeploying — not a find-and-replace across templates, PDFs and emails,
 * which is exactly the kind of sweep that leaves one stale mention in a
 * transactional email nobody reads until a customer does.
 *
 * Note this is the PLATFORM name. The house agency — currently Lavion Luxe
 * Properties — is a separate thing and lives with the other agencies, because
 * after the rename they are no longer the same entity.
 */

/** Short form: header wordmark, page titles, tight spaces. */
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Lavion Luxe";

/** Formal form: legal notices, PDF mastheads, email senders. */
export const BRAND_FULL_NAME =
  process.env.NEXT_PUBLIC_BRAND_FULL_NAME ?? `${BRAND_NAME} Properties`;

/** Bare domain, no scheme — used to build addresses and display URLs. */
export const BRAND_DOMAIN = process.env.NEXT_PUBLIC_BRAND_DOMAIN ?? "lavionluxe.com";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${BRAND_DOMAIN}`;

/** Uppercase wordmark for letterspaced eyebrows and PDF headers. */
export const BRAND_MARK = BRAND_FULL_NAME.toUpperCase();

export function brandEmail(mailbox: string): string {
  return `${mailbox}@${BRAND_DOMAIN}`;
}
