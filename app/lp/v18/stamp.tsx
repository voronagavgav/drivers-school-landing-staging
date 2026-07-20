"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { LEDGER } from "./copy";

// The violet «мокра печатка» — thumps onto the price with a 2° rotation + ink-bleed blur-in.
// Visible by default (final state in CSS); GSAP replays the thump when it scrolls into view.
// Reduced motion: it simply appears.
export default function Stamp() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      gsap.fromTo(
        el,
        { scale: 1.7, rotate: 14, autoAlpha: 0, filter: "blur(6px)" },
        {
          scale: 1,
          rotate: -2,
          autoAlpha: 1,
          filter: "blur(0px)",
          duration: 0.5,
          ease: "expo.out",
        }
      );
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) play();
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="v18-stamp" aria-hidden="true">
      <span className="v18-stamp-l1">{LEDGER.stamp.line1}</span>
      <span className="v18-stamp-l2">{LEDGER.stamp.line2}</span>
      <span className="v18-stamp-l3">{LEDGER.stamp.line3}</span>
    </div>
  );
}
