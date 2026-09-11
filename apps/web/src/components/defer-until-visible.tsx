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
  reserveClassName,
  className,
  rootMargin = "300px",
}: {
  children: React.ReactNode;
  /** Reserved height while idle, matching the loaded component. */
  minHeight?: number;
  /**
   * Responsive reservation while idle, e.g. "min-h-[822px] lg:min-h-[571px]".
   * A single number cannot be right at every width once the loaded component
   * reflows — a panel that is two columns on a laptop is one long column on a
   * phone, at more than twice the height.
   */
  reserveClassName?: string;
  /**
   * Always applied. Put outer spacing here, not on the child: a child's top
   * margin collapses through this wrapper, so it only exists once the child
   * mounts — and that appears as a layout shift no reservation can absorb.
   */
  className?: string;
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

  // The child is usually a next/dynamic import, which renders nothing after
  // `show` flips until its chunk has downloaded. Dropping the reservation at
  // `show` collapsed the space to zero for that moment and then re-expanded it:
  // two layout shifts, on the very component meant to prevent one — measured
  // as the sidebar jumping ~750px on a phone. So the space is held until the
  // child has actually put something in the DOM.
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    if (!show || arrived) return;
    const el = ref.current;
    if (!el) return;
    if (el.firstElementChild) {
      setArrived(true);
      return;
    }
    const mo = new MutationObserver(() => {
      if (el.firstElementChild) {
        setArrived(true);
        mo.disconnect();
      }
    });
    mo.observe(el, { childList: true });
    return () => mo.disconnect();
  }, [show, arrived]);

  const holding = !show || !arrived;

  return (
    <div
      ref={ref}
      className={[className, holding ? reserveClassName : undefined].filter(Boolean).join(" ") || undefined}
      style={holding && minHeight !== undefined ? { minHeight } : undefined}
    >
      {show ? children : null}
    </div>
  );
}
