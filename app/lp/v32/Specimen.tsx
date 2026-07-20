"use client";

import { useState } from "react";
import { SPECIMEN, plateLabel } from "./copy";

// The one live card in the catalogue. Collapsed, it sits in the §14 plate grid
// looking like any other plate, stamped «жива картка». Opened, it spans the row
// and becomes the real question, answerable inline. The full question + options
// are ALWAYS in the DOM (open/closed is a CSS class), so the real content ships
// in the SSR HTML and works without JS up to the answer interaction. No DB — the
// question is hard-coded from dev.db (q_14_10) in copy.ts.
export default function Specimen() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correctIndex = SPECIMEN.options.findIndex((o) => o.correct);
  const gotIt = picked === correctIndex;

  return (
    <figure className={`arch-plate arch-specimen${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="arch-specimen-shot"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <img
          src={`/restyled-live/${SPECIMEN.key}.png`}
          alt={`Дорожня ситуація до питання §${SPECIMEN.section} «${SPECIMEN.topic}», картка ${plateLabel(SPECIMEN.key)}`}
          width={512}
          height={288}
          loading="lazy"
          decoding="async"
        />
        <span className="arch-stamp">{SPECIMEN.mark}</span>
        <span className="arch-plate-cap arch-specimen-cap">
          <span className="arch-folio">{plateLabel(SPECIMEN.key)}</span>
          <span className="arch-hint">
            {open ? "згорнути" : `${SPECIMEN.hint} →`}
          </span>
        </span>
      </button>

      <div className="arch-specimen-body">
        <p className="arch-q-meta">
          <span className="arch-folio">{SPECIMEN.questionKey}</span>
          <span>
            §{SPECIMEN.section} · {SPECIMEN.topic}
          </span>
        </p>
        <p className="arch-q-text">{SPECIMEN.text}</p>
        <ul className="arch-opts">
          {SPECIMEN.options.map((o, i) => {
            const state = !answered
              ? ""
              : i === correctIndex
                ? " is-correct"
                : i === picked
                  ? " is-wrong"
                  : " is-dim";
            return (
              <li key={i}>
                <button
                  type="button"
                  className={`arch-opt${state}`}
                  disabled={answered}
                  onClick={() => setPicked(i)}
                >
                  <span className="arch-opt-key">
                    {String.fromCharCode(1040 + i) /* А, Б, В, Г */}
                  </span>
                  <span>{o.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div
          className={`arch-verdict${gotIt ? " ok" : ""}`}
          aria-live="polite"
          hidden={!answered}
        >
          <p>{gotIt ? SPECIMEN.right : SPECIMEN.wrong}</p>
          <div className="arch-verdict-row">
            <button
              type="button"
              className="arch-relink"
              onClick={() => setPicked(null)}
            >
              Спробувати ще раз
            </button>
            <a className="arch-relink arch-relink-go" href={SPECIMEN.more.href}>
              {SPECIMEN.more.label} →
            </a>
          </div>
        </div>
      </div>
    </figure>
  );
}
