import LessonArticle from "./LessonArticle";
import { COPY } from "./copy";

// v33 «Розбір» — the landing IS one lesson: an editorial teardown of a single
// real official ПДР question (q_13_3 / imageKey 13_3_0, category B). No section
// stack, no card grid — one longform article, conceived as an artifact of the
// domain. Self-contained: all data hard-coded in copy.ts (no runtime DB).

export default function V33Page() {
  const m = COPY.masthead;
  const c = COPY.colophon;
  return (
    <main className="v33">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <header className="v33-masthead">
        <div className="v33-mh-top">
          <span className="v33-brand">{COPY.brand}</span>
          <span className="v33-mh-date">{m.dateline}</span>
        </div>
        <div className="v33-mh-plate">
          <span className="v33-nameplate">{m.series}</span>
          <span className="v33-mh-issue">
            {m.issue} · {m.section}
          </span>
        </div>
        <div className="v33-mh-rule" aria-hidden="true" />
      </header>

      <LessonArticle />

      <footer className="v33-colophon">
        <p className="v33-disclaimer">{c.disclaimer}</p>
        <div className="v33-colophon-foot">
          <span>{c.copyright}</span>
          <span>{c.tagline}</span>
        </div>
      </footer>
    </main>
  );
}

const css = `
.v33{
  --paper: oklch(0.984 0.003 240);
  --paper-2: oklch(0.958 0.005 245);
  --ink: oklch(0.205 0.018 255);
  --ink-soft: oklch(0.415 0.014 255);
  --ink-faint: oklch(0.555 0.012 255);
  --accent: oklch(0.505 0.192 27);
  --accent-deep: oklch(0.415 0.155 27);
  --rule: oklch(0.882 0.008 250);
  --rule-soft: oklch(0.93 0.006 250);

  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body), Georgia, serif;
  font-size: clamp(1.06rem, 0.98rem + 0.4vw, 1.2rem);
  line-height: 1.62;
  font-weight: 400;
  overflow-x: clip;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.v33 *{ box-sizing: border-box; }

/* ── Reading progress (subtle top hairline) ─────────────────────────── */
.v33-progress{
  position: fixed; inset: 0 0 auto 0; height: 2px; z-index: 10;
  background: transparent; pointer-events: none;
}
.v33-progress span{
  display:block; height:100%; width:100%;
  background: var(--accent);
  transform: scaleX(0); transform-origin: 0 50%;
}

/* ── Column ─────────────────────────────────────────────────────────── */
.v33-masthead, .v33-article, .v33-colophon{
  max-width: 40rem; margin: 0 auto; padding-left: 1.5rem; padding-right: 1.5rem;
}
.v33-essay{ max-width: 37rem; margin: 0 auto; }

/* ── Masthead ───────────────────────────────────────────────────────── */
.v33-masthead{ padding-top: 1.6rem; }
.v33-mh-top{
  display:flex; justify-content:space-between; align-items:baseline; gap:1rem;
  flex-wrap: wrap;
}
.v33-brand{
  font-family: var(--font-display), serif; font-weight:700; font-size: 1.02rem;
  letter-spacing: -0.01em;
}
.v33-mh-date, .v33-mh-issue, .v33-kicker, .v33-sec-ref, .v33-note-n,
.v33-cta-note, .v33-opt-mark, .v33-stat dt, .v33-colophon-foot{
  font-family: var(--font-mono), monospace;
}
.v33-mh-date{ font-size: 0.72rem; color: var(--ink-faint); letter-spacing: 0.01em; }
.v33-mh-plate{
  display:flex; align-items:baseline; justify-content:space-between; gap:1rem;
  margin-top: 1.1rem;
}
.v33-nameplate{
  font-family: var(--font-display), serif; font-style: italic; font-weight:600;
  font-size: clamp(2.1rem, 1.4rem + 3vw, 3rem); line-height: 1; letter-spacing: -0.02em;
}
.v33-mh-issue{ font-size: 0.74rem; color: var(--ink-soft); text-align:right; }
.v33-mh-rule{
  margin-top: 0.9rem; height: 0; border-top: 3px solid var(--ink);
  box-shadow: 0 4px 0 -3px var(--ink);
}

/* ── Cold-open plate (full-bleed artwork) ───────────────────────────── */
.v33-plate{ margin: 1.6rem 0 2.2rem; }
.v33-plate-inner{
  position: relative; left: 50%; width: 100vw; margin-left: -50vw;
  max-width: 100vw; overflow: clip; background: var(--paper-2);
  border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
}
.v33-plate-inner img{
  display:block; width: 100%; max-width: 1040px; height: auto; margin: 0 auto;
  will-change: transform;
}
.v33-plate figcaption{
  font-family: var(--font-mono), monospace; font-size: 0.72rem; color: var(--ink-faint);
  margin-top: 0.7rem; padding-left: 0.1rem;
}

/* ── The question as headline ───────────────────────────────────────── */
.v33-kicker{ font-size: 0.74rem; color: var(--accent); letter-spacing: 0.01em; margin: 0 0 0.9rem; }
.v33-question{
  font-family: var(--font-display), serif; font-weight: 700;
  font-size: clamp(1.9rem, 1.1rem + 3.4vw, 3rem); line-height: 1.08;
  letter-spacing: -0.018em; margin: 0 0 1.8rem; text-wrap: balance;
}

/* ── Options (commit control) ───────────────────────────────────────── */
.v33-options{ display:flex; flex-direction:column; gap: 0.7rem; margin: 0 0 1rem; }
.v33-opt{
  display:flex; align-items: flex-start; gap: 0.9rem; width: 100%;
  text-align:left; background: transparent; cursor: pointer;
  border: 1px solid var(--rule); border-radius: 3px;
  padding: 0.95rem 1.05rem; color: var(--ink);
  font-family: var(--font-body), serif; font-size: 1rem; line-height: 1.45;
  transition: border-color .25s ease, background-color .25s ease, transform .2s ease;
}
.v33-opt:hover{ border-color: var(--ink-soft); background: var(--paper-2); }
.v33-opt:active{ transform: translateY(1px); }
.v33-opt-mark{
  flex: 0 0 auto; display:grid; place-items:center;
  width: 1.85rem; height: 1.85rem; border-radius: 50%;
  border: 1px solid var(--ink-soft); font-size: 0.82rem; font-weight: 500;
  color: var(--ink-soft); transition: all .25s ease;
}
.v33-opt-text{ padding-top: 0.15rem; }
.v33-opt.is-picked{ border-color: var(--accent); background: color-mix(in oklch, var(--accent) 5%, var(--paper)); }
.v33-opt.is-picked .v33-opt-mark{ background: var(--accent); border-color: var(--accent); color: var(--paper); }
.v33-opt:focus-visible{ outline: 2px solid var(--accent); outline-offset: 2px; }

.v33-commit{ min-height: 1.4em; font-size: 0.86rem; color: var(--ink-soft); margin: 0 0 0.5rem; }
.v33-commit-idle{ font-style: italic; color: var(--ink-faint); }
.v33-commit-done{ font-family: var(--font-mono), monospace; font-size: 0.78rem; color: var(--accent-deep); }

/* ── Essay prose ────────────────────────────────────────────────────── */
.v33-essay p{ margin: 0 0 1.25em; text-wrap: pretty; hyphens: auto; }
.v33-intro{
  font-size: 1.16em; line-height: 1.55; color: var(--ink);
  margin-top: 1.2rem;
}
.v33-intro::first-letter{
  font-family: var(--font-display), serif; font-weight: 700; float: left;
  font-size: 3.4em; line-height: 0.78; padding: 0.06em 0.12em 0 0; color: var(--accent);
}

.v33-sec{ margin-top: 2.8rem; padding-top: 1.6rem; border-top: 1px solid var(--rule-soft); }
.v33-sec-ref{
  font-size: 0.72rem; color: var(--accent); margin: 0 0 0.55rem; letter-spacing: 0.01em;
}
.v33-sec-title{
  font-family: var(--font-display), serif; font-weight: 700;
  font-size: clamp(1.5rem, 1.1rem + 1.6vw, 2rem); line-height: 1.12;
  letter-spacing: -0.015em; margin: 0 0 1rem; text-wrap: balance;
}
.v33-lead{ font-size: 1.08em; color: var(--ink); }
.v33-lead.is-keyed{
  border-left: 0; padding-left: 0; font-style: italic;
  color: var(--accent-deep);
}

/* Pull quote — display italic, hanging accent glyph. No side stripe. */
.v33-pull{
  margin: 1.8rem 0 1.4rem; padding: 0; border: 0;
  font-family: var(--font-display), serif; font-weight: 500; font-style: italic;
  font-size: clamp(1.35rem, 1rem + 1.8vw, 1.85rem); line-height: 1.24;
  letter-spacing: -0.01em; color: var(--ink); text-indent: -0.5em;
}
.v33-pull::before{ content: "“"; color: var(--accent); font-size: 1.1em; line-height: 0; }

.v33-fnref{
  font-family: var(--font-mono), monospace; font-size: 0.62em; vertical-align: super;
  color: var(--accent); text-decoration: none; padding: 0 0.05em 0 0.12em; font-weight: 500;
}
.v33-fnref:hover{ text-decoration: underline; }

/* Stat line for «Скільки таких ще» */
.v33-stats{
  display:flex; flex-wrap: wrap; gap: 1.6rem 2.2rem; margin: 1.8rem 0 0;
  padding-top: 1.3rem; border-top: 1px solid var(--rule);
}
.v33-stat{ margin: 0; }
.v33-stat dt{
  font-size: clamp(1.7rem, 1.2rem + 1.8vw, 2.3rem); font-weight: 500; color: var(--accent-deep);
  line-height: 1; letter-spacing: -0.02em;
}
.v33-stat dd{ margin: 0.4rem 0 0; font-size: 0.82rem; color: var(--ink-soft); max-width: 12ch; }

/* ── Close / endnote ────────────────────────────────────────────────── */
.v33-close{ margin-top: 3.2rem; padding-top: 1.8rem; border-top: 3px solid var(--ink); }
.v33-close-lead{ font-size: 1.14em; line-height: 1.5; }
.v33-close-sub{ color: var(--ink-soft); font-style: italic; margin-top: -0.4rem; }
.v33-cta{ display:flex; flex-wrap: wrap; align-items: center; gap: 0.9rem 1.4rem; margin: 1.6rem 0 0.6rem; }
.v33-cta-main{
  display:inline-flex; align-items:center; background: var(--ink); color: var(--paper);
  font-family: var(--font-body), serif; font-size: 1rem; font-weight: 500;
  padding: 0.85rem 1.5rem; border-radius: 3px; text-decoration: none;
  transition: background-color .25s ease, transform .2s ease;
}
.v33-cta-main:hover{ background: var(--accent-deep); transform: translateY(-1px); }
.v33-cta-main:focus-visible{ outline: 2px solid var(--accent); outline-offset: 3px; }
.v33-cta-alt{
  color: var(--ink); font-size: 0.95rem; text-decoration: none;
  border-bottom: 1px solid var(--ink-faint); padding-bottom: 1px;
  transition: border-color .25s ease, color .25s ease;
}
.v33-cta-alt:hover{ color: var(--accent-deep); border-color: var(--accent); }
.v33-cta-note{ font-size: 0.72rem; color: var(--ink-faint); margin: 0.2rem 0 0; }
.v33-paid{
  margin: 1.8rem 0 0.4rem; font-size: 0.86rem; line-height: 1.5; color: var(--ink-soft);
  padding-top: 1.2rem; border-top: 1px solid var(--rule-soft);
}
.v33-reassure{ font-size: 0.86rem; font-style: italic; color: var(--ink-faint); margin: 0; }

/* ── Footnotes ──────────────────────────────────────────────────────── */
.v33-notes{ margin-top: 2.6rem; }
.v33-notes-rule{ border: 0; border-top: 1px solid var(--rule); width: 4rem; margin: 0 0 1.1rem; }
.v33-notes ol{ list-style: none; margin: 0; padding: 0; }
.v33-notes li{
  position: relative; padding-left: 1.9rem; margin: 0 0 0.85rem;
  font-size: 0.82rem; line-height: 1.5; color: var(--ink-soft);
  scroll-margin-top: 5rem;
}
.v33-note-n{
  position: absolute; left: 0; top: 0.05rem; font-size: 0.7rem; color: var(--accent);
}
.v33-notes li:target{ color: var(--ink); }
.v33-notes li:target .v33-note-n{ font-weight: 600; }

/* ── Colophon ───────────────────────────────────────────────────────── */
.v33-colophon{ margin-top: 3.4rem; padding-top: 1.4rem; padding-bottom: 3rem; border-top: 1px solid var(--rule); }
.v33-disclaimer{ font-size: 0.76rem; line-height: 1.55; color: var(--ink-faint); max-width: 34rem; margin: 0 0 1.2rem; }
.v33-colophon-foot{
  display:flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
  font-size: 0.68rem; color: var(--ink-faint); letter-spacing: 0.01em;
}

@media (max-width: 34rem){
  .v33-mh-plate{ flex-direction: column; align-items: flex-start; gap: 0.3rem; }
  .v33-mh-issue{ text-align: left; }
  .v33-stats{ gap: 1.2rem 1.8rem; }
}

@media (prefers-reduced-motion: reduce){
  .v33-progress span{ transform: scaleX(0); }
  .v33-cta-main:hover, .v33-opt:active{ transform: none; }
  .v33 *{ scroll-behavior: auto; }
}
`;
