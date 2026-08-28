import type { Market } from "@lavion/schema";

/**
 * Market skylines for the hero backdrop.
 *
 * Drawn as inline SVG from geometric primitives rather than loaded as images:
 * it costs no request, never competes with the hero for LCP, scales to any
 * viewport, and takes its colour from the theme tokens so it works on both
 * grounds without a second asset.
 *
 * Deliberately silhouettes, not illustrations. The palette is petrol and
 * brass; a photographic skyline would fight it, and a detailed drawing would
 * pull attention off the headline. These sit at low opacity as atmosphere.
 */

const VB = { w: 1200, h: 340 };

function UnitedKingdom() {
  return (
    <>
      {/* Palace of Westminster — long river frontage with pinnacles */}
      <rect x="150" y="248" width="300" height="92" />
      {Array.from({ length: 11 }).map((_, i) => (
        <rect key={i} x={162 + i * 26} y="236" width="7" height="14" />
      ))}
      {/* Victoria Tower */}
      <rect x="150" y="176" width="52" height="164" />
      <polygon points="150,176 176,148 202,176" />
      <rect x="174" y="132" width="4" height="18" />

      {/* Elizabeth Tower (Big Ben) */}
      <rect x="404" y="150" width="46" height="190" />
      <rect x="398" y="128" width="58" height="24" />
      <circle cx="427" cy="172" r="15" fill="none" strokeWidth="4" stroke="currentColor" />
      <polygon points="400,128 427,62 454,128" />
      <rect x="425" y="44" width="4" height="20" />

      {/* London Eye */}
      <circle cx="880" cy="196" r="78" fill="none" strokeWidth="5" stroke="currentColor" />
      <circle cx="880" cy="196" r="60" fill="none" strokeWidth="2" stroke="currentColor" />
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return (
          <line
            key={i}
            x1="880"
            y1="196"
            x2={880 + Math.cos(a) * 78}
            y2={196 + Math.sin(a) * 78}
            strokeWidth="1.5"
            stroke="currentColor"
          />
        );
      })}
      <polygon points="856,272 880,200 904,272" />
      <rect x="838" y="330" width="84" height="10" />

      {/* Terrace roofline, keeping the base grounded */}
      <rect x="520" y="290" width="240" height="50" />
      <rect x="960" y="272" width="150" height="68" />
      <rect x="0" y="306" width="140" height="34" />
    </>
  );
}

function UnitedArabEmirates() {
  return (
    <>
      {/* Emirates Towers — two tapered prisms */}
      <polygon points="150,340 172,150 214,150 236,340" />
      <polygon points="172,150 193,120 214,150" />
      <polygon points="256,340 274,196 308,196 326,340" />
      <polygon points="274,196 291,170 308,170 308,196" />

      {/* Burj Khalifa — stepped setbacks tapering to the spire */}
      <rect x="556" y="196" width="88" height="144" />
      <rect x="568" y="150" width="64" height="52" />
      <rect x="580" y="112" width="40" height="44" />
      <rect x="590" y="84" width="20" height="32" />
      <rect x="597" y="30" width="6" height="58" />
      {/* Wing setbacks either side */}
      <polygon points="536,340 556,236 556,340" />
      <polygon points="664,340 644,236 644,340" />

      {/* Museum of the Future — torus on its plinth */}
      <ellipse cx="790" cy="268" rx="56" ry="46" fill="none" strokeWidth="9" stroke="currentColor" />
      <rect x="776" y="300" width="28" height="40" />

      {/* Burj Al Arab — the sail */}
      <path d="M 940 340 L 940 96 Q 1010 150 1046 340 Z" />
      <path
        d="M 940 96 Q 986 132 1012 218"
        fill="none"
        strokeWidth="3"
        stroke="currentColor"
        opacity="0.5"
      />
      <rect x="936" y="80" width="5" height="20" />

      <rect x="1090" y="288" width="110" height="52" />
      <rect x="0" y="300" width="120" height="40" />
    </>
  );
}

function Pakistan() {
  // Onion dome, drawn once and positioned — the defining silhouette of both
  // Badshahi and the wider Mughal vocabulary.
  const dome = (cx: number, base: number, r: number, key: string) => (
    <g key={key}>
      <path
        d={`M ${cx - r} ${base} Q ${cx - r} ${base - r * 1.35} ${cx} ${base - r * 1.85} Q ${cx + r} ${base - r * 1.35} ${cx + r} ${base} Z`}
      />
      <rect x={cx - 2} y={base - r * 2.3} width="4" height={r * 0.5} />
    </g>
  );

  const minaret = (x: number, top: number, key: string) => (
    <g key={key}>
      <rect x={x} y={top} width="16" height={340 - top} />
      <rect x={x - 4} y={top - 10} width="24" height="10" />
      {dome(x + 8, top - 10, 11, `${key}-cap`)}
    </g>
  );

  return (
    <>
      {/* Badshahi Mosque — prayer hall, three domes, four minarets */}
      <rect x="196" y="252" width="228" height="88" />
      <rect x="188" y="240" width="244" height="14" />
      {dome(310, 240, 44, "pk-dome-main")}
      {dome(238, 246, 26, "pk-dome-l")}
      {dome(382, 246, 26, "pk-dome-r")}
      {minaret(168, 168, "pk-min-1")}
      {minaret(436, 168, "pk-min-2")}
      {/* Arched façade */}
      {Array.from({ length: 5 }).map((_, i) => (
        <path
          key={i}
          d={`M ${216 + i * 44} 340 L ${216 + i * 44} 296 Q ${230 + i * 44} 278 ${244 + i * 44} 296 L ${244 + i * 44} 340 Z`}
          fill="none"
          strokeWidth="3"
          stroke="currentColor"
          opacity="0.55"
        />
      ))}

      {/* Minar-e-Pakistan — stepped platform, tapering shaft, crescent finial */}
      <rect x="596" y="322" width="132" height="18" />
      <rect x="612" y="306" width="100" height="18" />
      <rect x="628" y="292" width="68" height="16" />
      <polygon points="644,292 654,120 670,120 680,292" />
      <rect x="648" y="106" width="28" height="16" />
      <circle cx="662" cy="88" r="13" fill="none" strokeWidth="5" stroke="currentColor" />
      <rect x="660" y="52" width="4" height="26" />

      {/* Faisal Mosque — the desert-tent roof and its four minarets */}
      <polygon points="856,340 940,214 1024,340" />
      <polygon points="884,340 940,256 996,340" fill="none" strokeWidth="3" stroke="currentColor" opacity="0.5" />
      {minaret(842, 130, "pk-fm-1")}
      {minaret(1032, 130, "pk-fm-2")}

      <rect x="1090" y="296" width="110" height="44" />
      <rect x="0" y="304" width="130" height="36" />
    </>
  );
}

const SKYLINES: Record<Market, () => React.JSX.Element> = {
  uk: UnitedKingdom,
  ae: UnitedArabEmirates,
  pk: Pakistan,
};

export function Skyline({ market }: { market: Market }) {
  const Shapes = SKYLINES[market];

  return (
    <div
      aria-hidden
      data-parallax
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 select-none"
    >
      {/* Sized by width, not height: a height-constrained `meet` fit leaves the
          silhouette centred as an island with empty margins on wide screens.
          Letting width drive it spans the full hero and keeps the aspect. */}
      <svg
        viewBox={`0 0 ${VB.w} ${VB.h}`}
        preserveAspectRatio="xMidYMax meet"
        className="h-auto w-full"
        role="presentation"
        focusable="false"
      >
        <defs>
          {/* Fades the skyline into the page rather than ending on a hard edge */}
          <linearGradient id={`sky-fade-${market}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="white" stopOpacity="0.15" />
            <stop offset="0.45" stopColor="white" stopOpacity="0.85" />
            <stop offset="1" stopColor="white" stopOpacity="1" />
          </linearGradient>
          <mask id={`sky-mask-${market}`}>
            <rect width={VB.w} height={VB.h} fill={`url(#sky-fade-${market})`} />
          </mask>
        </defs>

        <g
          mask={`url(#sky-mask-${market})`}
          className="text-ink opacity-[0.15] dark:opacity-[0.19]"
          fill="currentColor"
        >
          <Shapes />
        </g>

        {/* Brass horizon — the connective device, tying the skyline to the rule
            under the headline and the hairlines used elsewhere. */}
        <rect
          x="0"
          y={VB.h - 1}
          width={VB.w}
          height="1"
          className="text-brass opacity-40"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
