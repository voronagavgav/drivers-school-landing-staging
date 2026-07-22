"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import Image, { type StaticImageData } from "next/image";
import { Accordion } from "radix-ui";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/csr/CalendarDots";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import { TargetIcon } from "@phosphor-icons/react/dist/csr/Target";
import examPreview from "@/assets/landing-mode-exam.png";
import mistakesPreview from "@/assets/landing-mode-mistakes.png";
import todayPreview from "@/assets/landing-mode-today.png";
import topicsPreview from "@/assets/landing-mode-topics.png";
import styles from "@/app/landing.module.css";

gsap.registerPlugin(Flip);

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

  const selectMode = (value: string) => {
    if (!modes.some((mode) => mode.value === value)) return;

    const nextMode = value as Mode;
    const root = rootRef.current;
    const isMobile = window.matchMedia("(max-width: 560px)").matches;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (nextMode === activeMode || !root || !isMobile || reduceMotion) {
      setActiveMode(nextMode);
      return;
    }

    const articles = root.querySelectorAll("article");
    const state = Flip.getState(articles);
    flushSync(() => setActiveMode(nextMode));
    Flip.from(state, {
      targets: articles,
      duration: 0.5,
      ease: "power3.out",
      absolute: false,
      nested: true,
      prune: true,
    });
  };

  return (
    <Accordion.Root
      type="single"
      value={activeMode}
      onValueChange={selectMode}
      orientation="horizontal"
      className={styles.horizontalAccordion}
      ref={rootRef}
    >
      {modes.map(({ value, title, description, image, imageAlt, icon: Icon }) => (
        <Accordion.Item value={value} asChild key={value}>
          <article
            className={activeMode === value ? styles.modeActive : undefined}
            onMouseEnter={() => selectMode(value)}
          >
            <Accordion.Header className={styles.modeHeader}>
              <Accordion.Trigger
                className={styles.modeTrigger}
                onFocus={() => selectMode(value)}
              >
                <Icon size={24} aria-hidden="true" />
                <span className={styles.modeCopy}>
                  <span className={styles.modeTitle}>{title}</span>
                  <span className={styles.modeDescription}>{description}</span>
                </span>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content forceMount className={styles.modeContent}>
              <div className={styles.modePreview} aria-hidden={activeMode !== value}>
                <Image
                  src={image}
                  alt={activeMode === value ? imageAlt : ""}
                  fill
                  sizes="(max-width: 560px) calc(100vw - 72px), (max-width: 900px) 46vw, 42vw"
                  className={styles.modePreviewImage}
                />
              </div>
            </Accordion.Content>
          </article>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}
