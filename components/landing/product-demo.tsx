"use client";

import { useEffect, useRef } from "react";
import questionFlowPoster from "@/assets/landing-question-flow-poster.webp";
import styles from "@/app/landing.module.css";

export function ProductDemo({ compact = false }: { compact?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    const syncPlayback = () => {
      if (motionPreference.matches) {
        video.pause();
        return;
      }

      void video.play().catch(() => {
        // Autoplay can be blocked by browser policy; the poster remains visible.
      });
    };

    syncPlayback();
    motionPreference.addEventListener("change", syncPlayback);
    return () => motionPreference.removeEventListener("change", syncPlayback);
  }, []);

  return (
    <div
      className={`${styles.heroPhone} ${compact ? styles.heroPhoneCompact : ""}`}
      data-hero-visual-reveal
    >
      <div className={styles.heroPhoneFrame}>
        <video
          ref={videoRef}
          className={styles.heroPhoneScreen}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          poster={questionFlowPoster.src}
          aria-label="Реальний екран Drivers School із питанням, відповіддю та поясненням"
        >
          <source src="/landing-question-flow.webm" type="video/webm" />
          <source src="/landing-question-flow.mp4" type="video/mp4" />
        </video>
      </div>
    </div>
  );
}
