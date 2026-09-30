import Image from "next/image";

/**
 * The landing hero's backdrop: all three markets at once.
 *
 * The market pages each sit on their own landmark. This page belongs to no
 * single market, and a flat ground left the first thing a visitor sees with
 * nothing in it — so the three photographs run as panels, which is also the
 * page's whole argument stated visually before a word is read.
 *
 * Blurred and heavily scrimmed on purpose: here the photography is texture
 * behind a headline, while the cards below show the same three images sharp.
 * The contrast is the point — atmosphere above, the actual choice below.
 *
 * Like HeroBackdrop, this commits to a dark treatment in BOTH themes: a
 * photograph cannot carry dark type in light mode and light type in dark
 * without a second crop and a second scrim. Hence the literal colours.
 */

const PANELS = [
  { src: "/hero/uk.webp", focal: "62% 50%" },
  { src: "/hero/ae.webp", focal: "58% 55%" },
  { src: "/hero/pk.webp", focal: "55% 45%" },
];

export function MarketTriptych() {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-[#0b1416]">
      {/* gap-px lets the ground through as three hairlines, so the panels read
          as three places rather than one wide photograph. */}
      <div className="absolute inset-0 grid grid-cols-3 gap-px">
        {PANELS.map((p) => (
          <div key={p.src} className="relative overflow-hidden">
            <Image
              src={p.src}
              alt=""
              fill
              priority
              sizes="34vw"
              quality={70}
              // scale hides the soft edge blur bleeds at the frame.
              className="scale-110 object-cover blur-[5px]"
              style={{ objectPosition: p.focal }}
            />
          </div>
        ))}
      </div>

      {/* Heaviest where the headline sits, lifting to the right so the panels
          stay readable as photographs rather than going uniformly flat. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(11,20,22,0.95) 0%, rgba(11,20,22,0.86) 38%, rgba(11,20,22,0.62) 72%, rgba(11,20,22,0.55) 100%)",
        }}
      />
      {/* Joins the next section instead of ending on a hard seam. */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background: "linear-gradient(180deg, transparent 0%, var(--color-paper) 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.13] mix-blend-overlay"
        style={{
          background:
            "radial-gradient(58% 52% at 74% 26%, var(--color-brass) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
