"use client";

import { useEffect } from "react";

/**
 * Scoped motion. GSAP and Lenis are dynamically imported and mounted ONLY by
 * the brand surfaces that opt in — the homepage hero and developer showcase.
 *
 * They are deliberately absent from listing detail, search results and area
 * guides, which are judged on LCP and INP and are the pages that have to rank.
 * Because the import lives here rather than in a shared layout, the bundle is
 * split at the route boundary and the money pages never download it.
 *
 * Enforced by bundle boundary, not by convention.
 */
export function MotionProvider({ smoothScroll = true }: { smoothScroll?: boolean }) {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let lenis: { destroy: () => void; raf: (t: number) => void } | null = null;
    let frame = 0;
    let killed = false;
    let observer: MutationObserver | null = null;
    let rescan = 0;
    const triggers: Array<{ kill: () => void }> = [];
    // Already wired, so a rescan never animates the same element twice.
    const wired = new WeakSet<Element>();

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (killed) return;

      gsap.registerPlugin(ScrollTrigger);
      document.documentElement.classList.add("js-motion");

      // Lenis is opt-in per surface. It replaces native scrolling, which costs
      // INP and interferes with assistive tech — worth it on a cinematic
      // showcase, never on a page someone is scanning for a 2-bed under 2M.
      if (smoothScroll) {
        const { default: Lenis } = await import("lenis");
        if (killed) return;
        const l = new Lenis({ duration: 1.05, smoothWheel: true });
        lenis = l as unknown as typeof lenis;
        const raf = (time: number) => {
          l.raf(time);
          frame = requestAnimationFrame(raf);
        };
        frame = requestAnimationFrame(raf);
        l.on("scroll", ScrollTrigger.update);
      }

      /*
       * Staggered reveal, one orchestrated pass rather than scattered effects.
       *
       * Run again whenever reveal content is added to the page. .js-motion
       * hides [data-reveal] at opacity 0 and relies on this to bring it back,
       * so a section that streams in after the first pass — a Suspense
       * boundary resolving, which is how the market inventory now arrives —
       * would otherwise never be wired up and would stay invisible forever.
       * That is not a missing animation; it is missing content.
       */
      const scan = () => {
        if (killed) return;

        for (const group of gsap.utils.toArray<HTMLElement>("[data-reveal-group]")) {
          const items = [...group.querySelectorAll<HTMLElement>("[data-reveal]")].filter(
            (el) => !wired.has(el),
          );
          if (!items.length) continue;
          for (const el of items) wired.add(el);
          const t = gsap.to(items, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            stagger: 0.08,
            ease: "expo.out",
            scrollTrigger: { trigger: group, start: "top 82%", once: true },
          });
          if (t.scrollTrigger) triggers.push(t.scrollTrigger);
        }

        // Loose elements outside a group.
        for (const el of gsap.utils.toArray<HTMLElement>(
          "[data-reveal]:not([data-reveal-group] *)",
        )) {
          if (wired.has(el)) continue;
          wired.add(el);
          const t = gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "expo.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
          if (t.scrollTrigger) triggers.push(t.scrollTrigger);
        }

        ScrollTrigger.refresh();
      };

      scan();

      // Streamed chunks land in bursts, so coalesce rather than scanning per node.
      observer = new MutationObserver((records) => {
        for (const r of records) {
          for (const node of r.addedNodes) {
            if (!(node instanceof Element)) continue;
            if (node.matches("[data-reveal], [data-reveal-group]") || node.querySelector("[data-reveal]")) {
              clearTimeout(rescan);
              rescan = window.setTimeout(scan, 60);
              return;
            }
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // Hero parallax — the image drifts slower than the page.
      const hero = document.querySelector<HTMLElement>("[data-parallax]");
      if (hero) {
        const t = gsap.to(hero, {
          yPercent: 14,
          ease: "none",
          scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
        });
        if (t.scrollTrigger) triggers.push(t.scrollTrigger);
      }

    })();

    return () => {
      killed = true;
      observer?.disconnect();
      clearTimeout(rescan);
      cancelAnimationFrame(frame);
      for (const t of triggers) t.kill();
      lenis?.destroy();
      document.documentElement.classList.remove("js-motion");
    };
  }, [smoothScroll]);

  return null;
}
