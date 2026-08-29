"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Without one, an unexpected throw shows the bare
 * Next.js error screen with none of the site's chrome — and no way back.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("route error", error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="max-w-[52ch] text-center">
        <p className="label" style={{ color: "var(--color-signal)" }}>
          Something went wrong
        </p>
        <h1 className="mt-4 font-display text-[clamp(1.8rem,4.5vw,3rem)] leading-tight">
          We could not load that.
        </h1>
        <div className="rule-brass mx-auto mt-6 w-24" />
        <p className="mt-6 leading-relaxed text-ink-soft">
          The problem is on our side, not yours. Trying again often works.
        </p>
        {error.digest && (
          <p className="label mt-4">Reference {error.digest}</p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-brass"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border border-line px-6 py-3 text-sm font-medium transition-colors hover:border-brass"
          >
            Start over
          </Link>
        </div>
      </div>
    </main>
  );
}
