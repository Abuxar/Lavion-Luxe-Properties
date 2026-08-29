import Link from "next/link";
import { MARKETS, type Market } from "@lavion/schema";

const ORDER: Market[] = ["uk", "ae", "pk"];

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="max-w-[52ch] text-center">
        <p className="label">404</p>
        <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3.4rem)] leading-tight">
          That page has moved on.
        </h1>
        <div className="rule-brass mx-auto mt-6 w-24" />
        <p className="mt-6 leading-relaxed text-ink-soft">
          A property may have been withdrawn, or the address may be mistyped.
          Sold and let listings keep their page, so this is more likely a broken
          link than a removed property.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {ORDER.map((m) => (
            <Link
              key={m}
              href={`/${m}/search`}
              className="label border border-line px-4 py-2.5 transition-colors hover:border-brass"
            >
              {MARKETS[m].label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
