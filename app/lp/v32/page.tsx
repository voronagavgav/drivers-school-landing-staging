import {
  COPY,
  ILLUSTRATED,
  INDEX,
  MARGIN,
  SPECIMEN,
  plateLabel,
} from "./copy";
import Specimen from "./Specimen";
import Motion from "./Motion";

// v32 «Архів» — the landing IS a printed index/catalogue of the real question
// bank. Content mass (the 60 approved plates) IS the structure. Server-rendered,
// DB-free; the single interactive leaf is <Specimen/>.

export const dynamic = "force-static";

function agreeQuestions(n: number): string {
  const t = n % 100;
  const o = n % 10;
  if (t >= 11 && t <= 14) return "питань";
  if (o === 1) return "питання";
  if (o >= 2 && o <= 4) return "питання";
  return "питань";
}
function agreeCards(n: number): string {
  const t = n % 100;
  const o = n % 10;
  if (t >= 11 && t <= 14) return "карток";
  if (o === 1) return "картка";
  if (o >= 2 && o <= 4) return "картки";
  return "карток";
}

export default function V32Page() {
  return (
    <main className="arch">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── MASTHEAD (title block, not a hero) ─────────────────────────────── */}
      <header className="arch-masthead">
        <div className="arch-folio-bar" data-rule>
          <span className="arch-brand">{COPY.brand}</span>
          <span className="arch-folio-mid">{COPY.masthead.folioLeft}</span>
          <span>{COPY.masthead.folioRight}</span>
        </div>

        <div className="arch-title-block">
          <p className="arch-kolontitul" data-mh>
            {COPY.masthead.kolontitul}
          </p>
          <h1 className="arch-title" data-mh>
            {COPY.masthead.title}
          </h1>
          <p className="arch-subtitle" data-mh>
            {COPY.masthead.subtitle}
          </p>
        </div>

        <dl className="arch-record" data-rec aria-label="Опис банку питань">
          {COPY.masthead.record.map((r) => (
            <div key={r.k} className="arch-rec">
              <dt>{r.k}</dt>
              <dd>{r.v}</dd>
            </div>
          ))}
        </dl>

        <p className="arch-lead" data-mh>
          {COPY.masthead.lead}{" "}
          <a className="arch-inline-link" href={COPY.masthead.openCta.href}>
            {COPY.masthead.openCta.label} →
          </a>
        </p>
      </header>

      {/* ── FRONT MATTER ───────────────────────────────────────────────────── */}
      <p className="arch-frontmatter">{COPY.frontMatter.note}</p>

      {/* ── ILLUSTRATED PLATES §11–§15 ─────────────────────────────────────── */}
      <div className="arch-plates">
        {ILLUSTRATED.map((sec) => (
          <section className="arch-sec" key={sec.n} aria-label={`Розділ ${sec.n}`}>
            <div className="arch-rail">
              <div className="arch-sec-no">§{sec.n}</div>
              <p className="arch-note">{MARGIN[sec.n]}</p>
            </div>

            <div className="arch-secbody">
              <div className="arch-sec-head">
                <h2 className="arch-sec-title">{sec.title}</h2>
                <span className="arch-counts">
                  {sec.count} {agreeQuestions(sec.count)} · {sec.cards}{" "}
                  {agreeCards(sec.cards)}
                </span>
              </div>

              <div className="arch-grid">
                {sec.keys.map((key) =>
                  key === SPECIMEN.key ? (
                    <Specimen key={key} />
                  ) : (
                    <figure className="arch-plate" key={key}>
                      <span className="arch-shot">
                        <img
                          src={`/restyled-live/${key}.png`}
                          alt={`Дорожня ситуація до питання §${sec.n} «${sec.title}», картка ${plateLabel(
                            key,
                          )}`}
                          width={512}
                          height={288}
                          loading="lazy"
                          decoding="async"
                        />
                      </span>
                      <figcaption className="arch-plate-cap">
                        <span className="arch-folio">{plateLabel(key)}</span>
                      </figcaption>
                    </figure>
                  ),
                )}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* ── FULL-BLEED ROW BREAK ───────────────────────────────────────────── */}
      <div className="arch-break">
        <div className="arch-break-inner">
          <p className="arch-break-line">{COPY.break.line}</p>
          <p className="arch-break-sub">{COPY.break.sub}</p>
        </div>
      </div>

      {/* ── INDEX STUBS (remaining 38 sections) ────────────────────────────── */}
      <section className="arch-indexblock" aria-label="Покажчик розділів">
        <div className="arch-index-head">
          <h2 className="arch-index-title">{COPY.indexHead.title}</h2>
          <p className="arch-index-note">{COPY.indexHead.note}</p>
        </div>
        <ol className="arch-index">
          {INDEX.map((s) => (
            <li className="arch-idx-row" key={s.n}>
              <span className="arch-idx-no">§{s.n}</span>
              <span className="arch-idx-title">{s.title}</span>
              <span className="arch-idx-lead" aria-hidden />
              <span className="arch-idx-count">
                {s.count}
                <span className="arch-idx-unit"> {agreeQuestions(s.count)}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── COLOPHON ───────────────────────────────────────────────────────── */}
      <footer className="arch-colophon">
        <p className="arch-colophon-kolon">{COPY.colophon.title}</p>
        <a className="arch-cta" href={COPY.colophon.freeCta.href}>
          {COPY.colophon.freeCta.label} →
        </a>
        <p className="arch-free-note">{COPY.colophon.freeNote}</p>
        <p className="arch-paid">{COPY.colophon.paid}</p>
        <p className="arch-disclaimer">{COPY.colophon.disclaimer}</p>
        <div className="arch-imprint">
          <span>{COPY.colophon.imprint}</span>
          <span>{COPY.colophon.copyright}</span>
        </div>
      </footer>

      <Motion />
    </main>
  );
}

const CSS = `
.arch{
  --paper: oklch(0.966 0.004 250);
  --plate: oklch(0.992 0.0015 250);
  --ink: oklch(0.255 0.05 262);
  --ink-2: oklch(0.365 0.04 262);
  --ink-3: oklch(0.5 0.03 262);
  --stamp: oklch(0.55 0.2 27);
  --stamp-deep: oklch(0.47 0.19 28);
  --rule: color-mix(in oklab, var(--ink) 20%, transparent);
  --rule-2: color-mix(in oklab, var(--ink) 40%, transparent);
  --doc: 1200px;
  --pad: clamp(1.15rem, 5vw, 4rem);
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  font-feature-settings: "tnum" 0;
}
.arch *{ box-sizing: border-box; }
.arch ::selection{ background: color-mix(in oklab, var(--stamp) 26%, transparent); }
.arch img{ max-width:100%; display:block; }

/* ── MASTHEAD ─────────────────────────────────────────────────────────────── */
.arch-masthead{ max-width: var(--doc); margin: 0 auto; padding: clamp(1.4rem,4vw,2.6rem) var(--pad) 0; }
.arch-folio-bar{
  display:flex; justify-content:space-between; align-items:baseline; gap:1rem;
  padding-bottom:.7rem; border-bottom:1.5px solid var(--ink);
  font-size:.72rem; letter-spacing:.06em; text-transform:uppercase;
  color:var(--ink-2); font-weight:500; flex-wrap:wrap;
}
.arch-brand{
  font-family:var(--font-display),serif; font-weight:800; font-size:.9rem;
  letter-spacing:-.01em; text-transform:none; color:var(--ink);
}
.arch-folio-mid{ flex:1; text-align:center; min-width:min-content; }

.arch-title-block{ padding: clamp(2.2rem,6vw,4.4rem) 0 clamp(1.4rem,3vw,2rem); }
.arch-kolontitul{
  font-size:.74rem; letter-spacing:.34em; text-transform:uppercase;
  color:var(--stamp-deep); font-weight:600; margin:0 0 clamp(.9rem,2vw,1.4rem);
}
.arch-title{
  font-family:var(--font-display),serif; font-weight:800;
  font-size:clamp(2.6rem, 8vw, 5rem); line-height:.98; letter-spacing:-.025em;
  margin:0; text-wrap:balance; max-width:16ch;
}
.arch-subtitle{
  font-family:var(--font-display),serif; font-style:italic; font-weight:500;
  font-size:clamp(1.05rem,2.6vw,1.55rem); color:var(--ink-2);
  margin:.55rem 0 0;
}

.arch-record{
  display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
  gap:0; margin:0; border-top:1px solid var(--rule); border-left:1px solid var(--rule);
}
.arch-rec{
  border-bottom:1px solid var(--rule); border-right:1px solid var(--rule);
  padding:.75rem .9rem .8rem;
}
.arch-rec dt{
  font-size:.68rem; letter-spacing:.05em; text-transform:uppercase;
  color:var(--ink-3); font-weight:600; margin-bottom:.3rem;
}
.arch-rec dd{
  margin:0; font-family:var(--font-display),serif; font-weight:700;
  font-size:1.5rem; line-height:1; font-variant-numeric:tabular-nums;
}
.arch-lead{
  max-width:62ch; margin:clamp(1.5rem,3.5vw,2.4rem) 0 0;
  font-size:clamp(1rem,1.7vw,1.15rem); line-height:1.6; color:var(--ink-2);
  text-wrap:pretty;
}
.arch-inline-link{
  color:var(--ink); font-weight:600; white-space:nowrap;
  text-decoration:underline; text-decoration-color:var(--stamp);
  text-underline-offset:4px; text-decoration-thickness:2px;
}
.arch-inline-link:hover{ color:var(--stamp-deep); }

/* ── FRONT MATTER ─────────────────────────────────────────────────────────── */
.arch-frontmatter{
  max-width: var(--doc); margin:clamp(2.2rem,5vw,3.4rem) auto 0;
  padding:1.1rem var(--pad); font-family:var(--font-display),serif;
  font-style:italic; font-size:clamp(.95rem,1.7vw,1.1rem); line-height:1.55;
  color:var(--ink-2);
}

/* ── ILLUSTRATED SECTIONS ─────────────────────────────────────────────────── */
.arch-plates{ max-width:var(--doc); margin:0 auto; padding:0 var(--pad); }
.arch-sec{
  display:grid; grid-template-columns:150px 1fr; gap:clamp(1rem,3vw,2.6rem);
  border-top:1px solid var(--rule-2); padding:clamp(1.7rem,4vw,3rem) 0;
}
.arch-rail{ position:relative; }
.arch-sec-no{
  font-family:var(--font-display),serif; font-weight:800;
  font-size:clamp(1.8rem,3vw,2.5rem); line-height:1; letter-spacing:-.02em;
  color:var(--ink); font-variant-numeric:tabular-nums;
}
.arch-note{
  margin:.9rem 0 0; font-size:.82rem; line-height:1.5; color:var(--ink-2);
  border-top:1px solid var(--rule); padding-top:.7rem; text-wrap:pretty;
}
.arch-sec-head{
  display:flex; align-items:baseline; justify-content:space-between;
  gap:1rem; margin-bottom:1.1rem; flex-wrap:wrap;
}
.arch-sec-title{
  font-family:var(--font-display),serif; font-weight:700;
  font-size:clamp(1.35rem,3vw,2rem); line-height:1.05; letter-spacing:-.01em;
  margin:0; text-wrap:balance;
}
.arch-counts{
  font-size:.76rem; letter-spacing:.03em; color:var(--ink-3); font-weight:600;
  text-transform:uppercase; white-space:nowrap; font-variant-numeric:tabular-nums;
}

.arch-grid{
  display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr));
  gap:1px; background:var(--rule); border:1px solid var(--rule);
}
.arch-plate{
  margin:0; background:var(--plate); padding:9px 9px 0;
  display:flex; flex-direction:column;
}
.arch-shot{
  display:block; border:1px solid var(--rule);
  background:#fff; overflow:hidden;
}
.arch-shot img{ width:100%; aspect-ratio:16/9; object-fit:cover;
  transition:transform .5s cubic-bezier(.16,1,.3,1); }
.arch-plate:hover .arch-shot img{ transform:scale(1.035); }
.arch-plate-cap{
  display:flex; align-items:center; justify-content:space-between;
  padding:.5rem .1rem .6rem; gap:.5rem;
}
.arch-folio{
  font-size:.7rem; font-weight:600; letter-spacing:.04em; color:var(--ink-2);
  font-variant-numeric:tabular-nums;
}

/* ── SPECIMEN (live card) ─────────────────────────────────────────────────── */
.arch-specimen.is-open{ grid-column:1 / -1; }
.arch-specimen:not(.is-open) .arch-specimen-body{ display:none; }
.arch-specimen.is-open .arch-specimen-cap{ display:none; }
.arch-specimen.is-open .arch-stamp{ display:none; }
.arch-specimen-shot{
  appearance:none; border:0; background:none; padding:0; margin:0;
  width:100%; text-align:left; cursor:pointer; position:relative;
  border:1px solid var(--stamp); display:block;
}
.arch-specimen:not(.is-open) .arch-specimen-shot{ background:var(--plate); padding:8px; }
.arch-specimen-shot img{
  width:100%; aspect-ratio:16/9; object-fit:cover;
  outline:1px solid var(--rule); outline-offset:-1px;
}
.arch-specimen.is-open .arch-specimen-shot img{ aspect-ratio:auto; max-height:340px; }
.arch-stamp{
  position:absolute; top:14px; left:14px; z-index:2;
  font-size:.64rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase;
  color:var(--stamp-deep); background:color-mix(in oklab,var(--paper) 88%,transparent);
  border:1.5px solid var(--stamp); padding:.24rem .5rem; border-radius:2px;
  transform:rotate(-3deg); box-shadow:0 1px 0 color-mix(in oklab,var(--stamp) 30%,transparent);
}
.arch-specimen-cap{ padding:.5rem .3rem .55rem; }
.arch-hint{
  font-size:.7rem; font-weight:600; letter-spacing:.02em; color:var(--stamp-deep);
}
.arch-specimen-body{
  padding:1.3rem clamp(.6rem,2vw,1.4rem) 1.4rem; border:1px solid var(--stamp);
  border-top:0; background:var(--plate);
}
.arch-q-meta{
  display:flex; gap:1rem; align-items:baseline; margin:0 0 .6rem;
  font-size:.72rem; letter-spacing:.03em; text-transform:uppercase;
  color:var(--ink-3); font-weight:600; flex-wrap:wrap;
}
.arch-q-text{
  font-family:var(--font-display),serif; font-weight:600;
  font-size:clamp(1.1rem,2.4vw,1.5rem); line-height:1.28; margin:0 0 1.1rem;
  max-width:44ch; text-wrap:balance;
}
.arch-opts{ list-style:none; margin:0; padding:0;
  display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:.6rem; }
.arch-opt{
  width:100%; text-align:left; display:flex; gap:.7rem; align-items:flex-start;
  padding:.8rem .9rem; background:var(--paper); border:1px solid var(--rule-2);
  color:var(--ink); font:inherit; font-size:.95rem; line-height:1.4; cursor:pointer;
  transition:border-color .15s, background .15s;
}
.arch-opt:hover:not(:disabled){ border-color:var(--ink); }
.arch-opt:disabled{ cursor:default; }
.arch-opt-key{
  font-family:var(--font-display),serif; font-weight:700; color:var(--ink-3);
  flex:none; width:1.4em; text-align:center;
}
.arch-opt.is-correct{ background:color-mix(in oklab,var(--stamp) 12%,var(--paper));
  border-color:var(--stamp); }
.arch-opt.is-correct .arch-opt-key{ color:var(--stamp-deep); }
.arch-opt.is-wrong{ border-color:var(--ink-3); text-decoration:line-through;
  color:var(--ink-3); }
.arch-opt.is-dim{ opacity:.55; }
.arch-verdict{
  margin-top:1.1rem; padding-top:1rem; border-top:1px solid var(--rule);
  font-size:.98rem; line-height:1.5; color:var(--ink-2);
}
.arch-verdict.ok{ color:var(--ink); }
.arch-verdict p{ margin:0 0 .8rem; max-width:60ch; }
.arch-verdict-row{ display:flex; gap:1.2rem; flex-wrap:wrap; align-items:baseline; }
.arch-relink{
  appearance:none; border:0; background:none; padding:0; cursor:pointer;
  font:inherit; font-size:.85rem; font-weight:600; color:var(--ink-2);
  text-decoration:underline; text-underline-offset:3px;
}
.arch-relink-go{ color:var(--stamp-deep);
  text-decoration-color:var(--stamp); text-decoration-thickness:2px; }
.arch-relink:hover{ color:var(--ink); }

/* ── FULL-BLEED BREAK ─────────────────────────────────────────────────────── */
.arch-break{
  margin:clamp(2.4rem,6vw,4.5rem) 0 0; margin-left:calc(50% - 50vw);
  width:100vw; background:var(--ink); color:var(--paper);
}
.arch-break-inner{
  max-width:var(--doc); margin:0 auto; padding:clamp(2.2rem,5vw,3.6rem) var(--pad);
}
.arch-break-line{
  font-family:var(--font-display),serif; font-weight:700;
  font-size:clamp(1.4rem,3.4vw,2.4rem); line-height:1.1; letter-spacing:-.015em;
  margin:0; max-width:22ch; text-wrap:balance;
}
.arch-break-sub{
  margin:.85rem 0 0; font-size:clamp(.95rem,1.7vw,1.1rem); line-height:1.5;
  color:color-mix(in oklab,var(--paper) 72%,var(--ink)); max-width:48ch;
}

/* ── INDEX STUBS ──────────────────────────────────────────────────────────── */
.arch-indexblock{ max-width:var(--doc); margin:0 auto;
  padding:clamp(2.4rem,6vw,4rem) var(--pad) 0; }
.arch-index-head{ margin-bottom:clamp(1.4rem,3vw,2rem); }
.arch-index-title{
  font-family:var(--font-display),serif; font-weight:700;
  font-size:clamp(1.5rem,3.4vw,2.2rem); letter-spacing:-.015em; margin:0;
}
.arch-index-note{ margin:.5rem 0 0; color:var(--ink-2);
  font-size:.95rem; max-width:56ch; }
.arch-index{
  list-style:none; margin:0; padding:0;
  columns:2; column-gap:clamp(2rem,5vw,4rem); border-top:1px solid var(--rule-2);
}
.arch-idx-row{
  display:flex; align-items:baseline; gap:.55rem;
  break-inside:avoid; padding:.62rem 0; border-bottom:1px solid var(--rule);
  font-size:.92rem;
}
.arch-idx-no{
  font-family:var(--font-display),serif; font-weight:700; color:var(--stamp-deep);
  font-variant-numeric:tabular-nums; flex:none; min-width:2.7em;
}
.arch-idx-title{ color:var(--ink); line-height:1.3; }
.arch-idx-lead{ flex:1; border-bottom:1px dotted var(--rule-2);
  transform:translateY(-.22em); min-width:1rem; }
.arch-idx-count{ flex:none; font-weight:700; color:var(--ink);
  font-variant-numeric:tabular-nums; }
.arch-idx-unit{ font-weight:500; color:var(--ink-3); font-size:.82em; }

/* ── COLOPHON ─────────────────────────────────────────────────────────────── */
.arch-colophon{
  max-width:640px; margin:clamp(3rem,7vw,5.5rem) auto 0;
  padding:clamp(2rem,4vw,2.6rem) var(--pad) clamp(2.6rem,6vw,4rem);
  text-align:center; border-top:3px double var(--ink);
}
.arch-colophon-kolon{
  font-size:.72rem; letter-spacing:.34em; text-transform:uppercase;
  color:var(--ink-3); font-weight:600; margin:0 0 clamp(1.3rem,3vw,1.9rem);
}
.arch-cta{
  display:inline-block; background:var(--ink); color:var(--paper);
  font-family:var(--font-display),serif; font-weight:700;
  font-size:clamp(1.02rem,2vw,1.2rem); padding:.85rem 1.5rem;
  text-decoration:none; border:1.5px solid var(--ink);
  transition:background .2s, border-color .2s, color .2s, transform .2s;
}
.arch-cta:hover{ background:var(--stamp); border-color:var(--stamp);
  transform:translateY(-2px); }
.arch-free-note{ margin:.95rem 0 0; font-size:.9rem; color:var(--ink-2); }
.arch-paid{
  margin:clamp(1.5rem,3vw,2rem) 0 0; font-size:.86rem; line-height:1.5;
  color:var(--ink-3); max-width:46ch; margin-inline:auto;
}
.arch-disclaimer{
  margin:clamp(1.5rem,3vw,2rem) auto 0; font-size:.76rem; line-height:1.55;
  color:var(--ink-3); max-width:52ch; padding-top:1.2rem;
  border-top:1px solid var(--rule);
}
.arch-imprint{
  margin-top:1.3rem; display:flex; flex-direction:column; gap:.25rem;
  font-size:.7rem; letter-spacing:.04em; text-transform:uppercase;
  color:var(--ink-3); font-weight:600;
}

/* ── RESPONSIVE ───────────────────────────────────────────────────────────── */
@media (max-width: 820px){
  .arch-sec{ grid-template-columns:1fr; gap:1rem; }
  .arch-rail{ display:flex; align-items:baseline; gap:1rem; }
  .arch-sec-no{ font-size:1.6rem; }
  .arch-note{ border-top:0; padding-top:0; margin-top:0; flex:1;
    font-style:italic; }
  .arch-index{ columns:1; }
}
@media (max-width: 480px){
  .arch-grid{ grid-template-columns:repeat(auto-fill,minmax(128px,1fr)); }
  .arch-folio-mid{ display:none; }
}

/* ── MOTION SAFETY ────────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce){
  .arch *{ transition:none !important; }
}
`;
