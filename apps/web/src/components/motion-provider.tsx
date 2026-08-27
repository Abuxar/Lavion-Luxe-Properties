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
    const triggers: Array<{ kill: () => void }> = [];

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

      // Staggered reveal, one orchestrated pass rather than scattered effects.
      const groups = gsap.utils.toArray<HTMLElement>("[data-reveal-group]");
      for (const group of groups) {
        const items = group.querySelectorAll("[data-reveal]");
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
      const solo = gsap.utils.toArray<HTMLElement>("[data-reveal]:not([data-reveal-group] *)");
      for (const el of solo) {
        const t = gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
        if (t.scrollTrigger) triggers.push(t.scrollTrigger);
      }

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

      ScrollTrigger.refresh();
    })();

    return () => {
      killed = true;
      cancelAnimationFrame(frame);
      for (const t of triggers) t.kill();
      lenis?.destroy();
      document.documentElement.classList.remove("js-motion");
    };
  }, [smoothScroll]);

  return null;
}
