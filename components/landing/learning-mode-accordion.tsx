"use client";

import { useEffect, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/csr/CalendarDots";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import { TargetIcon } from "@phosphor-icons/react/dist/csr/Target";
import examPreview from "@/assets/landing-mode-exam.png";
import mistakesPreview from "@/assets/landing-mode-mistakes.png";
import todayPreview from "@/assets/landing-mode-today.png";
import topicsPreview from "@/assets/landing-mode-topics.png";
import styles from "@/app/landing.module.css";

gsap.registerPlugin(useGSAP);

const modes = [
  {
    value: "today",
    title: "Сьогодні",
    description: "Коротка черга того, що потрібно закріпити саме зараз.",
    image: todayPreview,
    imageAlt: "Реальна домашня сторінка Drivers School з рекомендованою дією на сьогодні",
    icon: CalendarDotsIcon,
  },
  {
    value: "topics",
    title: "Теми",
    description: "Карта сильних і слабких зон без декоративних рейтингів.",
    image: topicsPreview,
    imageAlt: "Реальна сторінка прогресу Drivers School з готовністю за темами",
    icon: TargetIcon,
  },
  {
    value: "mistakes",
    title: "Помилки",
    description: "Контекст неправильної відповіді та шлях назад до правила.",
    image: mistakesPreview,
    imageAlt: "Реальна сторінка роботи над помилками Drivers School",
    icon: ArrowCounterClockwiseIcon,
  },
  {
    value: "exam",
    title: "Іспит",
    description: "Час, ліміт помилок і тиша, потрібна для чесної перевірки.",
    image: examPreview,
    imageAlt: "Реальна сторінка симуляції теоретичного іспиту Drivers School",
    icon: FlagIcon,
  },
] as const satisfies ReadonlyArray<{
  value: string;
  title: string;
  description: string;
  image: StaticImageData;
  imageAlt: string;
  icon: typeof CalendarDotsIcon;
}>;

type Mode = (typeof modes)[number]["value"];

export function LearningModeAccordion() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeMode, setActiveMode] = useState<Mode>("today");

  useGSAP(
    () => {
      const root = rootRef.current;
      if (
        !root ||
        !window.matchMedia("(min-width: 901px)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      const activeArticle = root.querySelector<HTMLElement>(
        `article.${styles.modeActive}`,
      );
      const activeTitle = activeArticle?.querySelector<HTMLElement>(
        `.${styles.modeTitle}`,
      );
      const activeDescription = activeArticle?.querySelector<HTMLElement>(
        `.${styles.modeDescription}`,
      );
      const inactiveDescriptions = Array.from(
        root.querySelectorAll<HTMLElement>(`.${styles.modeDescription}`),
      ).filter((description) => description !== activeDescription);

      if (!activeTitle || !activeDescription) return;

      gsap.killTweensOf([
        activeTitle,
        activeDescription,
        ...inactiveDescriptions,
      ]);
      gsap.set(inactiveDescriptions, {
        autoAlpha: 0,
        y: 8,
        clipPath: "inset(0 0 100% 0)",
      });

      const timeline = gsap.timeline();
      timeline
        .fromTo(
          activeTitle,
          { y: 5 },
          { y: 0, duration: 0.48, ease: "power3.out", clearProps: "transform" },
          0.08,
        )
        .fromTo(
          activeDescription,
          {
            autoAlpha: 0,
            y: 12,
            clipPath: "inset(0 0 100% 0)",
          },
          {
            autoAlpha: 1,
            y: 0,
            clipPath: "inset(0 0 0% 0)",
            duration: 0.46,
            ease: "power3.out",
            clearProps: "opacity,visibility,transform,clipPath",
          },
          0.16,
        );

      return () => timeline.kill();
    },
    { scope: rootRef, dependencies: [activeMode] },
  );

  useEffect(() => {
    const root = rootRef.current;
    const mobile = window.matchMedia("(max-width: 560px)");
    if (!root) return;

    let observer: IntersectionObserver | null = null;

    const syncObserver = () => {
      observer?.disconnect();
      observer = null;
      if (!mobile.matches) return;

      observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          const value = visible?.target.getAttribute("data-mode");

          if (value && modes.some((mode) => mode.value === value)) {
            setActiveMode((currentMode) =>
              currentMode === value ? currentMode : (value as Mode),
            );
          }
        },
        { root, threshold: [0.6] },
      );

      root
        .querySelectorAll<HTMLElement>("article[data-mode]")
        .forEach((article) => observer?.observe(article));
    };

    syncObserver();
    mobile.addEventListener("change", syncObserver);

    return () => {
      observer?.disconnect();
      mobile.removeEventListener("change", syncObserver);
    };
  }, []);

  const selectMode = (value: string) => {
    if (!modes.some((mode) => mode.value === value)) return;
    setActiveMode(value as Mode);
  };

  return (
    <div className={styles.horizontalAccordion} ref={rootRef}>
      {modes.map(({ value, title, description, image, imageAlt, icon: Icon }) => (
        <article
          key={value}
          data-mode={value}
          className={activeMode === value ? styles.modeActive : undefined}
          onMouseEnter={() => {
            if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
              selectMode(value);
            }
          }}
        >
          <div className={styles.modeHeader}>
            <button
              type="button"
              className={styles.modeTrigger}
              aria-pressed={activeMode === value}
              onClick={() => selectMode(value)}
              onFocus={() => {
                if (window.matchMedia("(min-width: 901px)").matches) {
                  selectMode(value);
                }
              }}
            >
              <Icon size={24} aria-hidden="true" />
              <span className={styles.modeCopy}>
                <span className={styles.modeTitle}>{title}</span>
                <span className={styles.modeDescription}>{description}</span>
              </span>
            </button>
          </div>
          <div className={styles.modePreview}>
            <Image
              src={image}
              alt={imageAlt}
              width={image.width}
              height={image.height}
              sizes="(max-width: 560px) calc(100vw - 72px), (max-width: 900px) 46vw, 42vw"
              className={styles.modePreviewImage}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
