import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import BlankForm from "./blank-form";
import Stamp from "./stamp";
import { HERO, STAMPS, LEDGER, FAQ, LAUNCHER, FOOTER, NAV, BRAND, CTA } from "./copy";
import { V18_CSS } from "./styles";

const activeHeadline = HERO.activeHeadline === "A" ? HERO.headlineA : HERO.headlineB;

export default function V18Page() {
  return (
    <div className="v18-root">
      <style dangerouslySetInnerHTML={{ __html: V18_CSS }} />

      <header className="v18-top">
        <span className="v18-wordmark">
          <span className="v18-wm-dot" aria-hidden="true" />
          {BRAND}
        </span>
        <a className="v18-login v18-login-desktop" href={NAV.loginHref}>
          {NAV.loginLabel}
        </a>
        <a className="v18-login v18-login-mobile" href={NAV.tryHref}>
          {NAV.tryLabel}
        </a>
      </header>

      <main>
        {/* ── Section 1 · БЛАНК — the one screen ───────────────────────── */}
        <section id="blank" className="v18-section v18-hero">
          <div className="v18-sheet-wrap">
            <div className="v18-sheet">
              <div className="v18-sheet-head">
                <div className="v18-form-meta">
                  <span className="v18-form-title">{HERO.formTitle}</span>
                  <span className="v18-form-code">{HERO.formCode}</span>
                </div>
                <hr className="v18-rule-hair" />
                <h1 className="v18-h1">{activeHeadline}</h1>
                <p className="v18-subhead">{HERO.subhead}</p>
                <p className="v18-epigraph">{HERO.epigraph}</p>
                <div className="v18-stamps" role="list" aria-label="Про базу">
                  {STAMPS.map((s) => (
                    <div className="v18-stamp-chip" role="listitem" key={s.small}>
                      <span className="v18-chip-big">{s.big}</span>
                      <span className="v18-chip-small">{s.small}</span>
                    </div>
                  ))}
                </div>
              </div>
              <BlankForm />
            </div>
          </div>
        </section>

        {/* ── Section 2 · ЗВОРОТНИЙ БІК — ledger + price ────────────────── */}
        <section id="zvorotnyj" className="v18-section v18-back">
          <div className="v18-sheet-wrap">
            <div className="v18-sheet v18-sheet-flip">
              <div className="v18-back-head">
                <span className="v18-form-code">{HERO.formCode} · зворот</span>
                <h2 className="v18-h2">{LEDGER.sectionTitle}</h2>
                <p className="v18-section-sub">{LEDGER.sectionSub}</p>
              </div>

              <div className="v18-ledger">
                <div className="v18-col v18-col-free">
                  <div className="v18-col-head">
                    <span className="v18-col-title">{LEDGER.freeHead}</span>
                    <span className="v18-col-tag">{LEDGER.freeAlways}</span>
                  </div>
                  <ul role="list">
                    {LEDGER.free.map((f) => (
                      <li key={f}>
                        <Check size={15} strokeWidth={3} /> {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="v18-col v18-col-paid">
                  <Stamp />
                  <div className="v18-col-head">
                    <span className="v18-col-price">{LEDGER.paidHead}</span>
                    <span className="v18-col-tag v18-col-tag-once">{LEDGER.paidOnce}</span>
                  </div>
                  <p className="v18-paid-title">{LEDGER.paidTitle}</p>
                  <ul role="list">
                    {LEDGER.paid.map((p) => (
                      <li key={p}>
                        <Check size={15} strokeWidth={3} /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="v18-bind">{LEDGER.bind}</p>
              <p className="v18-negation">{LEDGER.negation}</p>

              <ul className="v18-anchors" role="list">
                {LEDGER.anchors.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>

              <p className="v18-failsafe">{LEDGER.failsafe}</p>

              <div className="v18-trust" role="list">
                {LEDGER.trustBand.map((t) => (
                  <span role="listitem" key={t}>
                    {t}
                  </span>
                ))}
              </div>

              <a className="v18-btn-primary v18-btn-wide" href={CTA.primaryHref}>
                {LEDGER.cta}
                <ArrowRight size={18} strokeWidth={2.4} />
              </a>
            </div>
          </div>
        </section>

        {/* ── Section 3 · ПРИМІТКИ — disclosures + footer ──────────────── */}
        <section id="primitky" className="v18-section v18-notes">
          <div className="v18-sheet-wrap">
            <div className="v18-sheet v18-sheet-notes">
              <div className="v18-back-head">
                <span className="v18-form-code">дрібний шрифт</span>
                <h2 className="v18-h2">{FAQ.sectionTitle}</h2>
                <p className="v18-section-sub">{FAQ.sectionSub}</p>
              </div>

              <div className="v18-faq">
                {FAQ.items.map((it, i) => (
                  <details className="v18-qa" key={it.q} open={i === 0}>
                    <summary>
                      <h3 className="v18-qa-q">{it.q}</h3>
                      <span className="v18-qa-mark" aria-hidden="true" />
                    </summary>
                    <p className="v18-qa-a">{it.a}</p>
                  </details>
                ))}
              </div>

              <div className="v18-launcher">
                <span className="v18-launcher-title">{LAUNCHER.title}</span>
                {LAUNCHER.rows.map((r) => (
                  <a className="v18-launch-row" href={r.href} key={r.title}>
                    <span className="v18-launch-text">
                      <span className="v18-launch-t">{r.title}</span>
                      <span className="v18-launch-s">{r.sub}</span>
                    </span>
                    <ArrowUpRight size={18} strokeWidth={2.2} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="v18-footer">
        <div className="v18-footer-ghost" aria-hidden="true">
          {BRAND}
        </div>
        <div className="v18-footer-inner">
          <div className="v18-footer-brand">
            <span className="v18-wordmark v18-wordmark-light">
              <span className="v18-wm-dot" aria-hidden="true" />
              {FOOTER.wordmark}
            </span>
            <p className="v18-footer-tag">{FOOTER.tagline}</p>
            <p className="v18-footer-contact">
              {FOOTER.contactLabel}:{" "}
              <a href={`mailto:${FOOTER.contactEmail}`}>{FOOTER.contactEmail}</a>
            </p>
          </div>

          <div className="v18-footer-cols">
            {FOOTER.cols.map((c) => (
              <div className="v18-footer-col" key={c.head}>
                <span className="v18-footer-col-head">{c.head}</span>
                <ul role="list">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href}>{l.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p className="v18-disclaimer">{FOOTER.disclaimer}</p>
        <div className="v18-footer-legal">
          <span>{FOOTER.updated}</span>
          <span>{FOOTER.rights}</span>
        </div>
      </footer>
    </div>
  );
}
