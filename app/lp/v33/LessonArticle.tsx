"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { COPY } from "./copy";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

type Pick = "blue" | "white" | null;
const STORE_KEY = "v33_pick";

export default function LessonArticle() {
  const root = useRef<HTMLDivElement>(null);
  const [pick, setPick] = useState<Pick>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore the reader's prior commitment (client-only, no wall).
  useEffect(() => {
    try {
      const v = localStorage.getItem(STORE_KEY);
      if (v === "blue" || v === "white") setPick(v);
    } catch {}
    setHydrated(true);
  }, []);

  const commit = (v: Exclude<Pick, null>) => {
    setPick(v);
    try {
      localStorage.setItem(STORE_KEY, v);
    } catch {}
  };

  // Motion: subtle scroll reveals + image parallax + top reading rule.
  // Everything is visible by default (CSS); GSAP only enhances for capable,
  // motion-tolerant clients. Reduced-motion → no-op, content untouched.
  useEffect(() => {
    if (!root.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-rise]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 26,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
      });

      const art = root.current!.querySelector<HTMLElement>("[data-parallax]");
      if (art) {
        gsap.to(art, {
          yPercent: 8,
          ease: "none",
          scrollTrigger: {
            trigger: art.parentElement,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      }

      const bar = root.current!.querySelector<HTMLElement>("[data-progress]");
      if (bar) {
        gsap.to(bar, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.3,
          },
        });
      }
    }, root);

    return () => ctx.revert();
  }, []);

  const q = COPY.question;
  const trapLead = !pick ? COPY.trap.lead.none : COPY.trap.lead[pick];

  return (
    <div className="v33-article" ref={root}>
      <div className="v33-progress" aria-hidden="true">
        <span data-progress />
      </div>

      {/* ── COLD OPEN: the artwork, full-bleed ─────────────────────────── */}
      <figure className="v33-plate">
        <div className="v33-plate-inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-parallax
            src={q.image}
            alt={q.imageAlt}
            width={528}
            height={304}
            loading="eager"
          />
        </div>
        <figcaption>
          {q.caption.split("⁴")[0]}
          <a href="#fn-4" className="v33-fnref" aria-label="виноска 4">
            4
          </a>
          {q.caption.split("⁴")[1]}
        </figcaption>
      </figure>

      {/* ── The question is the headline ───────────────────────────────── */}
      <section className="v33-open">
        <p className="v33-kicker">{q.kicker}</p>
        <h1 className="v33-question">{q.text}</h1>

        <div className="v33-options" role="group" aria-label="Обери відповідь">
          {q.options.map((o) => {
            const active = pick === o.value;
            return (
              <button
                key={o.value}
                type="button"
                className={`v33-opt${active ? " is-picked" : ""}`}
                aria-pressed={active}
                onClick={() => commit(o.value as Exclude<Pick, null>)}
              >
                <span className="v33-opt-mark">{o.mark}</span>
                <span className="v33-opt-text">{o.text}</span>
              </button>
            );
          })}
        </div>

        <p className="v33-commit" aria-live="polite">
          {!hydrated || !pick ? (
            <span className="v33-commit-idle">{q.prompt}</span>
          ) : (
            <>
              <span className="v33-commit-done">{q.committed[pick]}</span>{" "}
              {q.lockedHint}
            </>
          )}
        </p>
      </section>

      {/* ── The essay ──────────────────────────────────────────────────── */}
      <div className="v33-essay">
        <p className="v33-intro" data-rise>
          {COPY.intro}
        </p>

        {/* (1) Пастка */}
        <section className="v33-sec" data-rise>
          <h2 className="v33-sec-title">{COPY.trap.section}</h2>
          <p className={`v33-lead${pick ? " is-keyed" : ""}`} aria-live="polite">
            {trapLead}
          </p>
          {COPY.trap.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>

        {/* (2) Правило */}
        <section className="v33-sec" data-rise>
          <p className="v33-sec-ref">{COPY.rule.ref}</p>
          <h2 className="v33-sec-title">{COPY.rule.section}</h2>
          <p>
            {COPY.rule.body[0].split("²")[0]}
            <a href="#fn-2" className="v33-fnref" aria-label="виноска 2">
              2
            </a>
            {COPY.rule.body[0].split("²")[1]}
          </p>
          <p>
            {COPY.rule.body[1].split("¹")[0]}
            <a href="#fn-1" className="v33-fnref" aria-label="виноска 1">
              1
            </a>
            {COPY.rule.body[1].split("¹")[1]}
          </p>
          <blockquote className="v33-pull">{COPY.rule.pull}</blockquote>
        </section>

        {/* (3) Як це запам'ятати */}
        <section className="v33-sec" data-rise>
          <h2 className="v33-sec-title">{COPY.memory.section}</h2>
          {COPY.memory.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>

        {/* (4) Скільки таких ще */}
        <section className="v33-sec" data-rise>
          <h2 className="v33-sec-title">{COPY.scope.section}</h2>
          {COPY.scope.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <dl className="v33-stats">
            {COPY.scope.stats.map((s, i) => (
              <div key={i} className="v33-stat">
                <dt>{s.k}</dt>
                <dd>{s.v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Endnote / close ──────────────────────────────────────────── */}
        <section className="v33-close" data-rise>
          <h2 className="v33-sec-title">{COPY.close.section}</h2>
          <p className="v33-close-lead">{COPY.close.lead}</p>
          <p className="v33-close-sub">{COPY.close.sub}</p>

          <div className="v33-cta">
            <a className="v33-cta-main" href={COPY.close.ctaPrimary.href}>
              {COPY.close.ctaPrimary.label}
            </a>
            <a className="v33-cta-alt" href={COPY.close.ctaSecondary.href}>
              {COPY.close.ctaSecondary.label}
            </a>
          </div>
          <p className="v33-cta-note">{COPY.close.ctaPrimaryNote}</p>

          <p className="v33-paid">{COPY.close.paid}</p>
          <p className="v33-reassure">
            {COPY.close.reassure.split("³")[0]}
            <a href="#fn-3" className="v33-fnref" aria-label="виноска 3">
              3
            </a>
            {COPY.close.reassure.split("³")[1]}
          </p>
        </section>

        {/* ── Footnotes ────────────────────────────────────────────────── */}
        <section className="v33-notes" aria-label="Виноски">
          <hr className="v33-notes-rule" />
          <ol>
            {COPY.footnotes.map((f) => (
              <li key={f.n} id={`fn-${f.n}`}>
                <span className="v33-note-n">{f.n}</span>
                {f.text}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
