"use client";

import { useEffect } from "react";
import { gsap } from "gsap";

// Masthead-only intro. Everything is fully visible by default (CSS), so a
// headless render or a JS failure ships the real page — gsap.from() merely
// replays toward that natural state. Reduced-motion gets nothing (instant).
export default function Motion() {
  useEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from("[data-rule]", { scaleX: 0, transformOrigin: "left center", duration: 0.9 })
        .from(
          "[data-mh]",
          { yPercent: 12, opacity: 0, duration: 0.8, stagger: 0.08 },
          "-=0.55",
        )
        .from(
          "[data-rec] .arch-rec",
          { opacity: 0, y: 8, duration: 0.5, stagger: 0.04 },
          "-=0.4",
        );
      return () => tl.kill();
    });

    return () => mm.revert();
  }, []);

  return null;
}
