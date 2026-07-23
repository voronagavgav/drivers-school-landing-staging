"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/csr/EnvelopeSimple";
import { Moon } from "@phosphor-icons/react/dist/csr/Moon";
import { Sun } from "@phosphor-icons/react/dist/csr/Sun";
import styles from "./public-trust-shell.module.css";

const TRUST_LINKS = [
  { href: "/terms", label: "Умови" },
  { href: "/privacy", label: "Приватність" },
  { href: "/support", label: "Підтримка" },
  { href: "/contact", label: "Контакти" },
  { href: "/source", label: "Джерело питань" },
];

const SOURCE_RAIL = [
  "ГСЦ МВС",
  "Наказ №225",
  "29.10.2025",
  "Офіційні питання",
  "Офіційні відповіді",
];

type TrustTheme = "light" | "dark";

export function PublicTrustShell({
  eyebrow,
  title,
  description,
  updated,
  sourceRail = false,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  updated?: string;
  sourceRail?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const normalizedPathname =
    pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const trustPathname =
    TRUST_LINKS.find(
      ({ href }) =>
        normalizedPathname === href || normalizedPathname.endsWith(href),
    )?.href ?? normalizedPathname;
  const isContactPage = trustPathname === "/contact";
  const [theme, setTheme] = useState<TrustTheme>("light");
  const [themeInput, setThemeInput] = useState<"keyboard" | "pointer">(
    "keyboard",
  );

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("drivers-school-theme");
    const nextTheme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    document.documentElement.dataset.theme = nextTheme;
    const frame = window.requestAnimationFrame(() => setTheme(nextTheme));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      window.localStorage.setItem("drivers-school-theme", nextTheme);
      document.documentElement.dataset.theme = nextTheme;
      return nextTheme;
    });
  };

  return (
    <div
      className={`${styles.shell} min-h-dvh bg-page px-5 py-6 sm:px-8 sm:py-8`}
      data-theme={theme}
    >
      <a
        href="#trust-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-card focus:bg-graphite-900 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-text-on-dark"
      >
        Перейти до вмісту
      </a>

      <div className={`${styles.frame} mx-auto w-full`}>
        <header
          className={`${styles.topHeader} flex flex-wrap items-center justify-between gap-4 border-b border-border-light pb-5`}
        >
          <Link href="/" className={styles.publicWordmark}>
            <span className={styles.publicWordmarkMark} aria-hidden="true">
              DS
            </span>
            <span>Drivers School</span>
          </Link>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.themeToggle}
              onClick={toggleTheme}
              onPointerDown={() => setThemeInput("pointer")}
              onKeyDown={() => setThemeInput("keyboard")}
              data-animate={themeInput === "pointer" ? "true" : "false"}
              aria-label={
                theme === "dark"
                  ? "Увімкнути світлу тему"
                  : "Увімкнути темну тему"
              }
              title={theme === "dark" ? "Світла тема" : "Темна тема"}
            >
              <span className={styles.themeIconStack} aria-hidden="true">
                <Sun
                  size={18}
                  className={`${styles.themeIcon} ${theme === "dark" ? styles.themeIconActive : ""}`}
                />
                <Moon
                  size={18}
                  className={`${styles.themeIcon} ${theme === "light" ? styles.themeIconActive : ""}`}
                />
              </span>
            </button>
            <Link
              href="/"
              className={`${styles.homeLink} inline-flex min-h-11 items-center gap-2 rounded-card px-3 text-sm font-semibold text-text-secondary transition-[transform,background-color,color] hover:bg-surface hover:text-text-primary active:scale-[.985]`}
            >
              <ArrowLeft size={16} weight="bold" aria-hidden="true" />
              <span className={styles.homeLinkLabel}>На головну</span>
            </Link>
          </div>
        </header>

        <nav
          aria-label="Інформація про сервіс"
          className={`${styles.nav} -mx-2 flex gap-1 overflow-x-auto px-2 py-4 [scrollbar-width:thin]`}
        >
          {TRUST_LINKS.map((link) => {
            const active = trustPathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`${styles.navLink} ${active ? styles.navLinkActive : ""} inline-flex min-h-11 shrink-0 items-center rounded-card px-3 text-sm font-semibold text-text-secondary transition-[transform,background-color,color] hover:bg-surface hover:text-text-primary active:scale-[.985]`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {sourceRail ? (
          <div className={styles.sourceRail} aria-hidden="true">
            <div className={styles.sourceRailTrack}>
              {[...SOURCE_RAIL, ...SOURCE_RAIL].map((item, index) => (
                <span key={`${item}-${index}`}>{item}</span>
              ))}
            </div>
          </div>
        ) : null}

        <main
          id="trust-content"
          tabIndex={-1}
          className={`${styles.contentGrid} grid scroll-mt-6 gap-8 py-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start lg:py-10`}
        >
          <article className="min-w-0">
            <header
              className={`${styles.heroHeader} border-b border-border-light pb-7`}
            >
              <div className={styles.heroLead}>
                <p className={styles.eyebrow}>{eyebrow}</p>
                <h1
                  className={`${styles.heroTitle} mt-2 max-w-5xl text-balance font-display text-[34px] font-semibold leading-[1.08] text-text-primary sm:text-[44px]`}
                >
                  {title}
                </h1>
              </div>
              <div className={styles.heroSummary}>
                <p className="max-w-[68ch] text-pretty text-base leading-7 text-text-secondary">
                  {description}
                </p>
                {updated ? (
                  <p className="mt-4 font-mono text-xs text-text-disabled">
                    Оновлено: {updated}
                  </p>
                ) : null}
              </div>
            </header>
            <div className="prose-trust mt-8 space-y-9">{children}</div>
          </article>

          <aside
            className={`${styles.aside} rounded-card bg-graphite-950 p-5 text-text-on-dark lg:sticky lg:top-6`}
          >
            <EnvelopeSimple
              size={23}
              weight="duotone"
              className="text-pink-300"
              aria-hidden="true"
            />
            <h2 className="mt-4 font-display text-lg font-semibold">
              {isContactPage
                ? "Потрібна допомога?"
                : "Потрібне уточнення?"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-on-dark-muted">
              {isContactPage
                ? "Перевірте короткі маршрути для входу, даних та офлайн-навчання."
                : "Напишіть, якщо питання стосується акаунта, даних, доступу або роботи навчання."}
            </p>
            {isContactPage ? (
              <Link
                href="/support"
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-card bg-pink-300 px-4 text-sm font-semibold text-pink-ink transition-[transform,background-color] hover:bg-pink-400 active:scale-[.985]"
              >
                Відкрити підтримку
              </Link>
            ) : (
              <Link
                href="/contact"
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-card bg-pink-300 px-4 text-sm font-semibold text-pink-ink transition-[transform,background-color] hover:bg-pink-400 active:scale-[.985]"
              >
                Звʼязатися
              </Link>
            )}
          </aside>
        </main>

        <footer
          className={`${styles.footer} mt-8 flex flex-col gap-4 border-t border-border-light py-6 text-xs leading-5 text-text-secondary sm:flex-row sm:items-center sm:justify-between`}
        >
          <p>
            Drivers School: навчальний інструмент, не офіційна система МВС.
          </p>
          <div className="flex flex-wrap gap-x-5">
            <Link
              href="/login"
              prefetch={false}
              className="inline-flex min-h-11 items-center px-1 transition-colors hover:text-text-primary"
            >
              Увійти
            </Link>
            <Link
              href="/register"
              prefetch={false}
              className="inline-flex min-h-11 items-center px-1 transition-colors hover:text-text-primary"
            >
              Створити акаунт
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function TrustSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-text-primary sm:text-2xl">
        {title}
      </h2>
      <div className="mt-3 max-w-[58ch] space-y-4 text-base leading-7 text-text-secondary">
        {children}
      </div>
    </section>
  );
}

export function TrustList({ children }: { children: ReactNode }) {
  return (
    <ul className="space-y-2 pl-5 marker:text-pink-500 [&>li]:list-disc">
      {children}
    </ul>
  );
}
