/**
 * The number enquiries actually reach.
 *
 * One source, because a phone number that is right in three places and stale
 * in a fourth is worse than one that is wrong everywhere — the stale one keeps
 * working just well enough that nobody notices the lost enquiries.
 *
 * Env-overridable so the client's own line replaces this without a code
 * change, the same way the brand strings work. NEXT_PUBLIC_ because the
 * floating button is a client component.
 *
 * Stored in E.164 (no spaces, no leading zero, country code included) because
 * that is the only form wa.me accepts. 03241775662 is the local Pakistani
 * dialling form of the same number: drop the trunk 0, prefix 92.
 */
export const WHATSAPP_E164 = process.env.NEXT_PUBLIC_WHATSAPP ?? "+923241775662";

/** Display form, for anywhere the number is shown rather than dialled. */
export const WHATSAPP_DISPLAY =
  process.env.NEXT_PUBLIC_WHATSAPP_DISPLAY ?? "+92 324 1775662";

/**
 * Build a wa.me link with a prefilled message.
 *
 * wa.me wants digits only — a leading "+" or any spacing silently produces a
 * broken link rather than an error, which is the kind of failure nobody finds
 * until an enquiry does not arrive.
 */
export function whatsappHref(message: string, phone: string = WHATSAPP_E164): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
