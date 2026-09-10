"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders children only once they approach the viewport.
 *
 * Used for below-the-fold interactive widgets. Code-splitting alone still
 * downloads and executes the chunk during hydration, which is what shows up as
 * Total Blocking Time; gating on visibility defers the execution itself.
 *
 * The placeholder reserves the final height so nothing shifts when the real
 * component arrives — deferring work must not buy TBT at the cost of CLS.
 */
export function DeferUntilVisible({
  children,
  minHeight,
  rootMargin = "300px",
}: {
  children: React.ReactNode;
  /** Reserved height while idle, matching the loaded component. */
  minHeight: number;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver (very old browsers): render immediately rather
    // than hiding the content entirely.
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show, rootMargin]);

  return (
    <div ref={ref} style={show ? undefined : { minHeight }}>
      {show ? children : null}
    </div>
  );
}
