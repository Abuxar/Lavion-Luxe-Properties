import Image from "next/image";
import type { Market } from "@lavion/schema";

/**
 * Photographic hero backdrop, one landmark per market.
 *
 * All three sources are cropped to an identical 16:9 and served at 1600x900,
 * so the framing is consistent when you switch markets rather than the hero
 * jumping height or crop.
 *
 * The hero commits to a dark treatment in BOTH themes. A photograph cannot
 * carry dark text in light mode and light text in dark mode without a second
 * crop and a second scrim, so the scrim always darkens and the hero type is
 * always light — an explicit choice, which is why the colours below are
 * literals rather than theme tokens.
 */

const IMAGES: Record<Market, { src: string; alt: string; focal: string }> = {
  uk: {
    src: "/hero/uk.webp",
    alt: "The Palace of Westminster and Big Ben in fog above the Thames",
    // Keep the tower off the headline, which sits left.
    focal: "62% 50%",
  },
  ae: {
    src: "/hero/ae.webp",
    alt: "The Dubai skyline rising above low cloud at sunrise",
    focal: "58% 55%",
  },
  pk: {
    src: "/hero/pk.webp",
    alt: "The Pakistan Monument in Islamabad lit at dusk",
    focal: "55% 45%",
  },
};

export function HeroBackdrop({ market }: { market: Market }) {
  const img = IMAGES[market];

  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden bg-[#0b1416]">
      {/* scale-105 hides the soft edge that blur otherwise bleeds at the frame. */}
      <Image
        src={img.src}
        alt={img.alt}
        fill
        priority
        sizes="100vw"
        quality={80}
        className="scale-105 object-cover blur-[3px]"
        style={{ objectPosition: img.focal }}
      />

      {/* Scrim. Heaviest at the left where the headline sits, and fading to the
          page ground at the bottom so the hero joins the next section rather
          than ending on a hard seam. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, rgba(11,20,22,0.92) 0%, rgba(11,20,22,0.78) 38%, rgba(11,20,22,0.45) 70%, rgba(11,20,22,0.35) 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{
          background: "linear-gradient(180deg, transparent 0%, var(--color-paper) 100%)",
        }}
      />

      {/* A breath of brass, tying the photograph to the rest of the palette. */}
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
