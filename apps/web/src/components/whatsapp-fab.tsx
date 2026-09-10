import { WHATSAPP_DISPLAY, whatsappHref } from "@/lib/contact";

/**
 * Floating WhatsApp enquiry button.
 *
 * In the UAE and Pakistan WhatsApp is the default channel for a serious
 * property enquiry, and the only route to it was previously buried in a
 * listing's sidebar — so a visitor browsing search results, a guide or an
 * area page had no way to ask a question without first picking a property.
 *
 * Deliberately NOT WhatsApp green. A saturated green disc is the one element
 * that would break a petrol-and-brass palette, and it reads as a bolted-on
 * widget rather than part of the site. It borrows the primary button's own
 * pairing instead — paper on ink, brass on hover — and lets the glyph carry
 * the recognition.
 *
 * The glyph is paper, not brass, and that was measured rather than chosen.
 * Brass on ink is 2.4:1 in the light theme and 1.9:1 in the dark one, against
 * the 3:1 a non-text icon needs; ink on brass is no better. Paper gives 12.3
 * and 15.0 at rest, 5.2 and 7.8 on hover. Note that --color-ink is LIGHT in
 * the dark theme, so this disc is cream there and petrol in the light theme —
 * which is why both directions had to be checked.
 *
 * Server component: no state, no effects, just a link. It costs nothing on the
 * client, which matters because this renders on the money pages.
 */

function WhatsAppGlyph() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="shrink-0"
    >
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.38-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.04 2A9.9 9.9 0 0 0 2.13 11.9c0 1.75.46 3.46 1.33 4.965L2.05 22l5.25-1.375a9.86 9.86 0 0 0 4.74 1.21h.004A9.9 9.9 0 0 0 21.95 11.94 9.9 9.9 0 0 0 12.04 2zm0 18.13h-.004a8.2 8.2 0 0 1-4.18-1.145l-.3-.178-3.11.815.83-3.037-.195-.312a8.2 8.2 0 0 1-1.257-4.373 8.23 8.23 0 0 1 8.22-8.22c2.196 0 4.26.856 5.81 2.41a8.17 8.17 0 0 1 2.407 5.816 8.23 8.23 0 0 1-8.22 8.22z" />
    </svg>
  );
}

export function WhatsAppFab({ context }: { context?: string }) {
  const message = context
    ? `Hello, I have a question about ${context}.`
    : "Hello, I'd like to ask about a property.";

  return (
    <a
      href={whatsappHref(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Message us on WhatsApp at ${WHATSAPP_DISPLAY}`}
      title={`WhatsApp ${WHATSAPP_DISPLAY}`}
      /*
       * Sits above the footer but clear of the viewport edge. The inset uses
       * env(safe-area-inset-bottom) so it is not under the home indicator on
       * an iPhone, where a fixed bottom-right control otherwise becomes
       * genuinely untappable.
       *
       * print:hidden because a printed listing with a floating chat button on
       * it looks like a broken page — and estate agents do print listings.
       */
      className="group fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-50 flex items-center gap-0 overflow-hidden rounded-full border border-brass/50 bg-ink pl-[13px] pr-[13px] text-paper shadow-[0_6px_24px_-8px_rgba(0,0,0,0.55)] transition-[gap,padding,background-color,border-color,color] duration-300 hover:border-brass hover:bg-brass hover:text-paper focus-visible:border-brass motion-reduce:transition-none sm:hover:gap-2.5 sm:hover:pr-5 print:hidden"
      style={{ height: "46px" }}
    >
      <WhatsAppGlyph />
      {/*
        The label expands on hover on pointer devices only. On a phone there is
        no hover, and a permanently wide pill covers listing cards — so touch
        gets the disc, and the accessible name carries the meaning either way.
      */}
      <span className="label hidden max-w-0 whitespace-nowrap !text-current opacity-0 transition-[max-width,opacity] duration-300 group-hover:max-w-[9rem] group-hover:opacity-100 motion-reduce:transition-none sm:inline">
        WhatsApp
      </span>
    </a>
  );
}
