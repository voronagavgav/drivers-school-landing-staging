// Scoped stylesheet for landing v18 «Бланк». Injected via a <style> tag on the route
// (keeps everything inside app/lp/v18/, never touches globals.css). All rules are
// prefixed .v18- so they cannot leak into the app shell.

export const V18_CSS = `
.v18-root{
  --v18-bg:#F1F2EF;
  --v18-surface:#FBFBF9;
  --v18-ink:#20221E;
  --v18-ink-soft:#53574F;
  --v18-rule:#D7D9D3;
  --v18-rule-soft:#E3E4DF;
  --v18-violet:#5B3FA8;
  --v18-violet-ink:#4A3190;
  --v18-violet-soft:rgba(91,63,168,.09);
  --v18-green:#2E6B4F;
  --v18-green-soft:rgba(46,107,79,.10);
  --v18-shadow:0 1px 0 rgba(32,34,30,.04), 0 18px 44px -28px rgba(32,34,30,.30);

  font-family:var(--font-cuprum), "Segoe UI", system-ui, sans-serif;
  color:var(--v18-ink);
  background-color:var(--v18-bg);
  background-image:repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 33px,
    rgba(120,124,116,.06) 33px,
    rgba(120,124,116,.06) 34px
  );
  -webkit-font-smoothing:antialiased;
  line-height:1.45;
  overflow-x:hidden;
}
.v18-root *{box-sizing:border-box;}
.v18-root ul{list-style:none;margin:0;padding:0;}
.v18-root a{color:inherit;text-decoration:none;}

/* ── Top bar ─────────────────────────────────────────────── */
.v18-top{
  max-width:1120px;margin:0 auto;
  display:flex;align-items:center;justify-content:space-between;
  padding:clamp(16px,2.4vw,26px) clamp(18px,4vw,40px);
}
.v18-wordmark{
  display:inline-flex;align-items:center;gap:9px;
  font-weight:700;font-size:1.12rem;letter-spacing:-.01em;color:var(--v18-ink);
}
.v18-wm-dot{
  width:12px;height:12px;border-radius:50%;
  background:var(--v18-violet);
  box-shadow:0 0 0 3px var(--v18-violet-soft);
  flex:none;
}
.v18-login{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.78rem;letter-spacing:.04em;text-transform:uppercase;
  color:var(--v18-ink-soft);
  padding:8px 15px;border:1px solid var(--v18-rule);border-radius:3px;
  background:var(--v18-surface);
  transition:border-color .18s, color .18s;
}
.v18-login:hover{border-color:var(--v18-violet);color:var(--v18-violet);}
.v18-login-mobile{display:none;}

/* ── Section + sheet shell ───────────────────────────────── */
.v18-section{padding:clamp(8px,2vw,26px) clamp(14px,4vw,40px) clamp(24px,3vw,40px);}
/* Pull the flip-side + notes sheets up so they read as one folded document — the зворот's
   folded corner peeks above the previous fold instead of three cards floating on gray. */
.v18-back,.v18-notes{margin-top:clamp(-36px,-3.4vw,-18px);}
.v18-sheet-wrap{max-width:760px;margin:0 auto;}
.v18-sheet{
  background:var(--v18-surface);
  border:1px solid var(--v18-rule);
  border-radius:3px;
  box-shadow:var(--v18-shadow);
  padding:clamp(22px,4.4vw,46px);
}
.v18-sheet-flip{position:relative;overflow:hidden;}
.v18-sheet-flip::before{
  content:"";position:absolute;top:0;right:0;
  border-width:0 46px 46px 0;border-style:solid;
  border-color:var(--v18-bg) var(--v18-bg) var(--v18-rule) var(--v18-rule);
  filter:drop-shadow(-2px 2px 2px rgba(32,34,30,.06));
}

/* ── Sheet head (hero) ───────────────────────────────────── */
.v18-form-meta{display:flex;align-items:baseline;justify-content:space-between;gap:12px;}
.v18-form-title,.v18-form-code{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;
  color:var(--v18-ink-soft);
}
.v18-form-title{color:var(--v18-violet-ink);font-weight:700;}
.v18-rule-hair{border:0;border-top:1px solid var(--v18-rule);margin:12px 0 20px;}
.v18-h1{
  font-weight:700;
  font-size:clamp(2.5rem,5.8vw,5rem);
  line-height:1.02;letter-spacing:-.025em;
  text-wrap:balance;
  margin:0 0 12px;
}
.v18-subhead{
  font-size:clamp(1rem,2vw,1.15rem);color:var(--v18-ink-soft);
  max-width:52ch;margin:0 0 18px;text-wrap:pretty;
}
.v18-epigraph{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.86rem;line-height:1.5;letter-spacing:.005em;
  color:var(--v18-ink);
  background:var(--v18-violet-soft);
  border-top:1.5px solid var(--v18-violet);
  border-bottom:1px solid var(--v18-rule);
  padding:11px 14px;margin:0 0 22px;
}
.v18-stamps{
  display:grid;grid-template-columns:repeat(4,1fr);gap:10px;
  padding-top:4px;
}
.v18-stamp-chip{
  display:flex;flex-direction:column;gap:2px;
  padding:9px 11px;border:1px solid var(--v18-rule);border-radius:3px;
  background:linear-gradient(180deg,var(--v18-surface),#F6F6F2);
}
.v18-chip-big{
  font-weight:700;font-size:1.18rem;line-height:1;letter-spacing:-.01em;color:var(--v18-ink);
  font-variant-numeric:tabular-nums;
}
.v18-chip-small{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.62rem;letter-spacing:.06em;text-transform:uppercase;color:var(--v18-ink-soft);
  line-height:1.25;
}

/* ── Fields ──────────────────────────────────────────────── */
.v18-fields{margin-top:8px;}
.v18-field{border-top:1px solid var(--v18-rule);padding:22px 0;}
.v18-field-last{padding-bottom:4px;}
.v18-field-head{
  display:grid;grid-template-columns:auto 1fr auto;align-items:baseline;
  gap:12px;margin-bottom:14px;
}
.v18-field-n{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:1.35rem;font-weight:700;color:var(--v18-violet);
  line-height:1;min-width:1.1ch;
}
.v18-field-label{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.82rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  color:var(--v18-ink);margin:0;
}
.v18-field-note{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.7rem;letter-spacing:.03em;color:var(--v18-ink-soft);text-align:right;
}

/* Field 1 — question */
.v18-question{font-size:1.12rem;line-height:1.4;margin:0 0 16px;max-width:60ch;}
.v18-options{display:flex;flex-direction:column;gap:9px;}
.v18-option{
  width:100%;display:flex;align-items:center;gap:13px;text-align:left;
  font-family:inherit;font-size:1.02rem;color:var(--v18-ink);
  background:var(--v18-surface);
  border:1px solid var(--v18-rule);border-radius:4px;
  padding:13px 15px;cursor:pointer;
  transition:border-color .16s, background .16s, transform .08s;
}
.v18-option:hover{border-color:var(--v18-violet);background:#fff;}
.v18-option:active{transform:translateY(1px);}
.v18-tick{
  flex:none;width:26px;height:26px;border-radius:4px;
  display:grid;place-items:center;
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.82rem;font-weight:700;text-transform:uppercase;
  border:1px solid var(--v18-rule);color:var(--v18-ink-soft);background:#F4F4F0;
}
.v18-option[data-state="correct"]{border-color:var(--v18-green);background:var(--v18-green-soft);}
.v18-option[data-state="correct"] .v18-tick{background:var(--v18-green);border-color:var(--v18-green);color:#fff;}
.v18-option[data-state="wrong"]{border-color:var(--v18-ink-soft);border-style:dashed;opacity:.72;}
.v18-answer{margin-top:14px;padding:13px 15px;border:1px dashed var(--v18-rule);border-radius:4px;background:#F6F6F2;}
.v18-answer[data-correct="true"]{border-color:var(--v18-green);background:var(--v18-green-soft);border-style:solid;}
.v18-answer-note{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.82rem;font-weight:700;letter-spacing:.02em;margin:0 0 7px;color:var(--v18-ink);
}
.v18-answer[data-correct="true"] .v18-answer-note{color:var(--v18-green);}
.v18-expl{font-size:.95rem;line-height:1.5;margin:0;color:var(--v18-ink-soft);}

/* Field 2 — dial */
.v18-dial-row{display:flex;align-items:center;gap:22px;flex-wrap:wrap;}
.v18-dial{position:relative;flex:none;width:118px;height:118px;display:grid;place-items:center;}
.v18-dial svg{display:block;}
.v18-dial-center{
  position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  pointer-events:none;
}
.v18-dial-num{
  font-weight:700;font-size:2.3rem;line-height:1;color:var(--v18-violet-ink);
  font-variant-numeric:tabular-nums;
}
.v18-dial-unit{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.68rem;letter-spacing:.06em;color:var(--v18-ink-soft);margin-top:2px;
}
.v18-dial-copy{flex:1;min-width:200px;}
.v18-dial-state{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.76rem;letter-spacing:.03em;text-transform:uppercase;color:var(--v18-violet-ink);
  margin:0 0 7px;
}
.v18-mono-note{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.78rem;line-height:1.55;color:var(--v18-ink-soft);margin:0;
}

/* Field 3 — date + plan */
.v18-date{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;max-width:280px;}
.v18-date-label{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;color:var(--v18-ink-soft);
}
.v18-date input{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:1rem;color:var(--v18-ink);
  padding:11px 13px;border:1px solid var(--v18-rule);border-radius:4px;
  background:var(--v18-surface);width:100%;
}
.v18-date input:focus{outline:2px solid var(--v18-violet);outline-offset:1px;border-color:var(--v18-violet);}
.v18-plan{
  border-top:1px solid var(--v18-rule);padding-top:16px;
}
.v18-plan-line{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:9px;}
.v18-plan-intensive{
  font-size:.98rem;line-height:1.5;color:var(--v18-ink);margin:0 0 9px;max-width:52ch;
}
.v18-plan-strong{font-weight:700;font-size:1.3rem;letter-spacing:-.01em;color:var(--v18-ink);}
.v18-plan-line>span:not(.v18-plan-strong):not(.v18-tag){font-size:1.05rem;color:var(--v18-ink-soft);}
.v18-plan-dot{color:var(--v18-rule);}
.v18-tag{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.64rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;
  color:#fff;background:var(--v18-violet);padding:3px 8px;border-radius:3px;
}
.v18-plan-topics{font-size:.92rem;line-height:1.5;color:var(--v18-ink);margin:0 0 9px;}
.v18-retaker{
  font-size:.9rem;line-height:1.5;color:var(--v18-ink-soft);margin:9px 0 0;
  padding-top:9px;border-top:1px dashed var(--v18-rule);font-style:italic;
}

/* Field 4 — submit */
.v18-cta-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:14px;}
.v18-btn-primary{
  display:inline-flex;align-items:center;gap:9px;
  font-family:inherit;font-weight:700;font-size:1.08rem;
  color:#fff;background:var(--v18-violet);
  padding:14px 26px;border-radius:5px;
  box-shadow:0 1px 0 rgba(255,255,255,.25) inset, 0 10px 22px -12px rgba(91,63,168,.7);
  transition:background .18s, transform .08s;
}
.v18-btn-primary:hover{background:var(--v18-violet-ink);}
.v18-btn-primary:active{transform:translateY(1px);}
.v18-btn-wide{width:100%;justify-content:center;margin-top:6px;padding:16px;}
.v18-btn-secondary{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.9rem;letter-spacing:.01em;color:var(--v18-violet-ink);
  border-bottom:1.5px solid var(--v18-violet);padding-bottom:2px;
  transition:color .16s;
}
.v18-btn-secondary:hover{color:var(--v18-ink);border-color:var(--v18-ink);}
.v18-reassure{display:flex;gap:16px;flex-wrap:wrap;}
.v18-reassure li{
  display:inline-flex;align-items:center;gap:6px;
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.74rem;letter-spacing:.02em;color:var(--v18-ink-soft);
}
.v18-reassure svg{color:var(--v18-green);}

/* ── Section 2 · back / ledger ───────────────────────────── */
.v18-back-head{margin-bottom:22px;}
.v18-h2{
  font-weight:700;font-size:clamp(1.7rem,4vw,2.35rem);letter-spacing:-.02em;
  line-height:1.05;margin:8px 0 8px;text-wrap:balance;
}
.v18-section-sub{font-size:1.02rem;color:var(--v18-ink-soft);margin:0;max-width:48ch;}
.v18-ledger{
  display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;
}
.v18-col{border:1px solid var(--v18-rule);border-radius:4px;padding:18px 18px 20px;}
.v18-col-free{background:var(--v18-surface);}
.v18-col-paid{background:var(--v18-violet-soft);border-color:rgba(91,63,168,.32);position:relative;overflow:hidden;}
.v18-col-head{display:flex;align-items:baseline;gap:9px;margin-bottom:14px;}
.v18-col-title{font-weight:700;font-size:1.4rem;letter-spacing:-.01em;}
.v18-col-price{font-weight:700;font-size:2rem;letter-spacing:-.02em;color:var(--v18-violet-ink);line-height:1;}
.v18-col-tag{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.66rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--v18-ink-soft);
}
.v18-col-tag-once{color:var(--v18-violet-ink);}
.v18-paid-title{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:var(--v18-violet-ink);margin:0 0 12px;
}
.v18-col ul{display:flex;flex-direction:column;gap:10px;}
.v18-col li{display:flex;align-items:flex-start;gap:9px;font-size:.98rem;line-height:1.35;}
.v18-col-free svg{color:var(--v18-green);flex:none;margin-top:2px;}
.v18-col-paid svg{color:var(--v18-violet);flex:none;margin-top:2px;}
.v18-bind{font-size:1.05rem;line-height:1.45;margin:0 0 6px;color:var(--v18-ink);max-width:52ch;}
.v18-negation{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.86rem;font-weight:700;letter-spacing:.03em;color:var(--v18-violet-ink);margin:0 0 18px;
}
.v18-anchors{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;}
.v18-anchors li{
  font-size:.94rem;line-height:1.45;color:var(--v18-ink-soft);
  padding-left:16px;position:relative;
}
.v18-anchors li::before{content:"—";position:absolute;left:0;color:var(--v18-violet);}
.v18-failsafe{
  font-size:.94rem;line-height:1.5;color:var(--v18-ink);
  background:#F6F6F2;border:1px dashed var(--v18-rule);border-radius:4px;
  padding:13px 15px;margin:0 0 18px;max-width:60ch;
}
.v18-trust{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px;}
.v18-trust span{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.72rem;letter-spacing:.04em;color:var(--v18-ink-soft);
  border:1px solid var(--v18-rule);border-radius:3px;padding:6px 11px;background:var(--v18-surface);
}

/* Violet «мокра печатка» stamp */
.v18-stamp{
  position:absolute;top:12px;right:10px;transform:rotate(-2deg);
  display:flex;flex-direction:column;align-items:center;gap:1px;
  color:var(--v18-violet);
  border:2.5px solid var(--v18-violet);border-radius:7px;
  padding:7px 10px 6px;
  font-family:var(--font-anon), ui-monospace, monospace;
  opacity:.9;mix-blend-mode:multiply;
  box-shadow:inset 0 0 0 1px rgba(91,63,168,.35);
}
.v18-stamp-l1{font-size:.6rem;font-weight:700;letter-spacing:.12em;}
.v18-stamp-l2{font-size:.9rem;font-weight:700;letter-spacing:.06em;line-height:1;}
.v18-stamp-l3{font-size:.52rem;letter-spacing:.08em;}

/* ── Section 3 · notes / faq ─────────────────────────────── */
.v18-faq{border-top:1px solid var(--v18-rule);margin-bottom:26px;}
.v18-qa{border-bottom:1px solid var(--v18-rule);}
.v18-qa summary{
  list-style:none;cursor:pointer;
  display:flex;align-items:center;justify-content:space-between;gap:14px;
  padding:16px 2px;
}
.v18-qa summary::-webkit-details-marker{display:none;}
.v18-qa-q{font-weight:600;font-size:1.08rem;letter-spacing:-.005em;margin:0;color:var(--v18-ink);}
.v18-qa-mark{position:relative;flex:none;width:16px;height:16px;}
.v18-qa-mark::before,.v18-qa-mark::after{
  content:"";position:absolute;background:var(--v18-violet);border-radius:2px;
  transition:transform .2s ease;
}
.v18-qa-mark::before{top:7px;left:0;width:16px;height:2px;}
.v18-qa-mark::after{top:0;left:7px;width:2px;height:16px;}
.v18-qa[open] .v18-qa-mark::after{transform:scaleY(0);}
.v18-qa-a{
  font-size:.98rem;line-height:1.6;color:var(--v18-ink-soft);
  margin:0;padding:0 2px 18px;max-width:66ch;text-wrap:pretty;
}

.v18-launcher{display:flex;flex-direction:column;gap:0;}
.v18-launcher-title{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--v18-ink-soft);
  margin-bottom:10px;
}
.v18-launch-row{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:15px 4px;border-top:1px solid var(--v18-rule);
  transition:transform .16s ease, color .16s;
}
.v18-launch-row:last-child{border-bottom:1px solid var(--v18-rule);}
.v18-launch-row:hover{transform:translateX(6px);color:var(--v18-violet-ink);}
.v18-launch-text{display:flex;flex-direction:column;gap:2px;}
.v18-launch-t{font-weight:600;font-size:1.06rem;color:inherit;}
.v18-launch-s{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.74rem;letter-spacing:.02em;color:var(--v18-ink-soft);
}
.v18-launch-row svg{color:var(--v18-violet);flex:none;}

/* ── Footer ──────────────────────────────────────────────── */
.v18-footer{
  position:relative;overflow:hidden;
  background:var(--v18-ink);color:#E9EAE5;
  padding:clamp(44px,6vw,72px) clamp(18px,4vw,40px) 28px;
  line-height:1.5;
}
.v18-footer-ghost{
  position:absolute;left:-2vw;bottom:-3.5vw;
  font-weight:700;font-size:clamp(4rem,16vw,13rem);line-height:.8;
  color:rgba(255,255,255,.04);letter-spacing:-.03em;pointer-events:none;user-select:none;white-space:nowrap;
}
.v18-footer-inner{
  position:relative;max-width:1000px;margin:0 auto;
  display:grid;grid-template-columns:1.4fr 1fr;gap:32px;
}
.v18-wordmark-light{color:#F4F5F1;}
.v18-footer-tag{color:#B7BAB1;font-size:1rem;margin:12px 0 10px;max-width:40ch;}
.v18-footer-contact{font-family:var(--font-anon), ui-monospace, monospace;font-size:.82rem;color:#B7BAB1;margin:0;}
.v18-footer-contact a{color:#C6B6F2;border-bottom:1px solid rgba(198,182,242,.4);}
.v18-footer-contact a:hover{color:#fff;}
.v18-footer-cols{display:flex;gap:40px;flex-wrap:wrap;}
.v18-footer-col-head{
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:#8D9188;
  display:block;margin-bottom:12px;
}
.v18-footer-col ul{display:flex;flex-direction:column;gap:9px;}
.v18-footer-col a{color:#D5D7D0;font-size:.95rem;}
.v18-footer-col a:hover{color:#fff;}
.v18-disclaimer{
  position:relative;max-width:1000px;margin:36px auto 0;
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.74rem;line-height:1.65;color:#9A9E94;
  padding-top:20px;border-top:1px solid rgba(255,255,255,.1);
  max-width:82ch;
}
.v18-footer-legal{
  position:relative;max-width:1000px;margin:16px auto 0;
  display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;
  font-family:var(--font-anon), ui-monospace, monospace;
  font-size:.72rem;color:#8D9188;
}

/* ── Responsive ──────────────────────────────────────────── */
@media (max-width:640px){
  /* Stamps collapse from a 2×2 grid (~240px, eats the fold) to one compact scrollable strip,
     lifting Поле 1's interactive question up into the first viewport. */
  .v18-stamps{
    display:flex;grid-template-columns:none;gap:8px;
    overflow-x:auto;-webkit-overflow-scrolling:touch;
    margin-left:-2px;padding:4px 2px 2px;scrollbar-width:none;
  }
  .v18-stamps::-webkit-scrollbar{display:none;}
  .v18-stamp-chip{
    flex:0 0 auto;flex-direction:row;align-items:baseline;gap:6px;padding:7px 10px;
  }
  .v18-chip-big{font-size:.98rem;}
  .v18-chip-small{font-size:.56rem;}
  .v18-ledger{grid-template-columns:1fr;}
  .v18-footer-inner{grid-template-columns:1fr;gap:26px;}
  .v18-h1{font-size:clamp(2.1rem,8.6vw,3rem);}
  .v18-form-meta{flex-direction:column;gap:2px;}
  /* Header shows a zero-friction try link instead of «Увійти» so a visitor who scrolls past the
     form still has a conversion affordance without needing to reach the Поле 4 CTA two screens down. */
  .v18-login-desktop{display:none;}
  .v18-login-mobile{display:inline-flex;color:var(--v18-violet-ink);border-color:var(--v18-violet);}
}

/* ── Reduced motion ──────────────────────────────────────── */
@media (prefers-reduced-motion:reduce){
  .v18-root *{transition:none !important;animation:none !important;}
}
`;
