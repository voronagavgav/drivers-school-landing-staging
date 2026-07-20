"use client";

import { useEffect, useRef, useState, useId } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, ArrowRight, ChevronDown } from "lucide-react";
import {
  BRAND,
  HERO,
  FREE_LEDGER,
  READINESS,
  MECHANISM,
  DATE,
  LOSS,
  PRICING,
  PROOF,
  FAQ,
  FINAL,
  FOOTER,
  STATS,
  REGISTER_HREF,
  LOGIN_HREF,
  ANON_TRY_HREF,
} from "./copy";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const heroLine = HERO.variants[HERO.active];
/* hook rendered from copy, with the ranked stat bolded in place */
const hookParts = HERO.hook.split(STATS.firstPassShort);
const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Wrap every ₴ so it renders in the sans face — JetBrains Mono has no U+20B4
   glyph, so a bare ₴ in a `.mono` context falls back to a heavier system one. */
function money(text: string): React.ReactNode[] {
  const parts = text.split("₴");
  return parts.flatMap((p, i) =>
    i === 0 ? [p] : [<span className="uah" key={`u${i}`}>₴</span>, p]
  );
}

/* Ukrainian plural: 1 день · 2–4 дні · 5–20 днів (then by last digit). */
function ukPlural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

type Seg = { readonly t: string; readonly tone?: "muted" | "acc"; readonly num?: boolean };
/* Render a copy-defined segmented line: `tone` two-tones the run-on headline,
   `num` marks a mono amount token; ₴ is always sans-wrapped via money(). */
function Segments({ parts }: { parts: readonly Seg[] }) {
  return (
    <>
      {parts.map((s, i) => {
        const cls = s.num ? "num" : s.tone;
        return cls ? (
          <span key={i} className={cls}>{money(s.t)}</span>
        ) : (
          <span key={i}>{money(s.t)}</span>
        );
      })}
    </>
  );
}

/* ============================ scoped styles ============================ */
/* Honest-ledger light: cool green-tinted paper, graphite-green ink, ONE
   verdigris accent <5% of pixels. Mono numerals everywhere (tabular →
   zero layout shift on count-up). Dark theme = recessed panels. */
const CSS = `
.v23{
  --bg:#F4F5F2; --surface:#FBFBF8; --surface-2:#EFF1EB;
  --ink:#22272B; --ink-2:#3B454B; --muted:#57626A;
  --accent:#0E7A6C; --accent-ink:#FBFBF8;
  --tint:rgba(14,122,108,.065); --tint-2:rgba(14,122,108,.13);
  --rule:rgba(34,39,43,.13); --rule-2:rgba(34,39,43,.28);
  --dark:#171B1E; --dark-panel:#20262A; --dark-cream:#ECEEE8; --dark-rule:rgba(236,238,232,.14);
  font-family:var(--v23-sans),system-ui,-apple-system,sans-serif;
  color:var(--ink); background:var(--bg);
  -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
}
@media (prefers-color-scheme:dark){
  .v23{
    --bg:#14181A; --surface:#1C2124; --surface-2:#22282B;
    --ink:#E9EBE6; --ink-2:#C4CAC5; --muted:#98A19C;
    --accent:#37A996; --accent-ink:#0B0F10;
    --tint:rgba(55,169,150,.1); --tint-2:rgba(55,169,150,.17);
    --rule:rgba(233,235,230,.13); --rule-2:rgba(233,235,230,.26);
    --dark:#0E1214; --dark-panel:#191E21; --dark-cream:#E9EBE6; --dark-rule:rgba(233,235,230,.13);
  }
}
:root[data-theme="dark"] .v23,.dark .v23{
  --bg:#14181A; --surface:#1C2124; --surface-2:#22282B;
  --ink:#E9EBE6; --ink-2:#C4CAC5; --muted:#98A19C;
  --accent:#37A996; --accent-ink:#0B0F10;
  --tint:rgba(55,169,150,.1); --tint-2:rgba(55,169,150,.17);
  --rule:rgba(233,235,230,.13); --rule-2:rgba(233,235,230,.26);
  --dark:#0E1214; --dark-panel:#191E21; --dark-cream:#E9EBE6; --dark-rule:rgba(233,235,230,.13);
}
:root[data-theme="light"] .v23{
  --bg:#F4F5F2; --surface:#FBFBF8; --surface-2:#EFF1EB;
  --ink:#22272B; --ink-2:#3B454B; --muted:#57626A;
  --accent:#0E7A6C; --accent-ink:#FBFBF8;
  --tint:rgba(14,122,108,.065); --tint-2:rgba(14,122,108,.13);
  --rule:rgba(34,39,43,.13); --rule-2:rgba(34,39,43,.28);
}
.v23 ::selection{background:var(--tint-2);}
.v23 *{box-sizing:border-box;}
.mono{font-family:var(--v23-mono),ui-monospace,monospace;font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1,"zero" 1;}
.wrap{width:100%;max-width:1120px;margin-inline:auto;padding-inline:clamp(20px,5vw,48px);}
.wrapN{width:100%;max-width:940px;margin-inline:auto;padding-inline:clamp(20px,5vw,48px);}
.sec{padding-block:clamp(84px,11vw,150px);}
.eyebrow{font-family:var(--v23-mono),monospace;font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:600;}
.secTitle{font-weight:700;letter-spacing:-.03em;line-height:1.04;font-size:clamp(1.7rem,3.4vw,2.5rem);text-wrap:balance;}
.secSub{color:var(--muted);font-size:clamp(1rem,1.4vw,1.12rem);line-height:1.5;max-width:60ch;}
.rule{border:none;border-top:1px solid var(--rule);margin:0;}
.srOnly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
/* hryvnia ₴: JetBrains Mono has no U+20B4 glyph → render it in the sans face,
   weight/size-matched to the mono numerals so amounts read as one unit. */
.uah{font-family:var(--v23-sans);font-weight:700;font-size:.92em;}
/* honest-demo marker: one word that flags illustrative specimen numbers */
.demoTag{display:inline-block;font-family:var(--v23-mono),monospace;font-size:.62rem;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);border:1px solid var(--rule);border-radius:3px;padding:2px 7px;}

/* ledger */
.ledgerHead{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding-block:12px;border-bottom:1.5px solid var(--rule-2);}
.colLbl{font-family:var(--v23-mono),monospace;font-size:.7rem;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);}
.lrow{display:grid;grid-template-columns:1fr auto;gap:16px 24px;align-items:center;padding-block:clamp(18px,2.4vw,26px);border-bottom:1px solid var(--rule);}
.lrow.flag{background:var(--tint);margin-inline:clamp(-14px,-2vw,-20px);padding-inline:clamp(14px,2vw,20px);border-radius:4px;border-bottom:1px solid var(--rule);}
.llabel{font-weight:600;font-size:clamp(1.02rem,1.5vw,1.18rem);letter-spacing:-.01em;}
.lnote{color:var(--muted);font-size:.9rem;margin-top:3px;line-height:1.4;}
.stamp{font-family:var(--v23-mono),monospace;font-weight:600;color:var(--accent);font-size:clamp(1rem,1.5vw,1.15rem);white-space:nowrap;text-align:right;}
.stampNote{display:block;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:var(--accent);margin-top:2px;}

/* chips / cells */
.cells{display:flex;flex-wrap:wrap;gap:0;border:1px solid var(--rule-2);border-radius:6px;overflow:hidden;width:fit-content;max-width:100%;}
.cell{font-family:var(--v23-mono),monospace;font-size:.8rem;letter-spacing:.02em;padding:9px 15px;color:var(--ink-2);border-right:1px solid var(--rule);white-space:nowrap;}
.cell:last-child{border-right:none;}

/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;font-family:var(--v23-sans);font-weight:600;font-size:1rem;letter-spacing:-.01em;padding:15px 26px;border-radius:8px;border:1px solid transparent;cursor:pointer;transition:transform .18s cubic-bezier(.2,.7,.3,1),background .18s,box-shadow .18s,border-color .18s;text-decoration:none;line-height:1;}
.btn:active{transform:translateY(1px);}
.btnPri{background:var(--accent);color:var(--accent-ink);box-shadow:0 1px 0 rgba(0,0,0,.04);}
.btnPri:hover{background:color-mix(in oklab,var(--accent),#000 9%);box-shadow:0 6px 20px -8px var(--accent);}
.btnSec{background:transparent;color:var(--ink);border-color:var(--rule-2);}
.btnSec:hover{background:var(--surface-2);border-color:var(--ink-2);}
.btnGhost{background:transparent;color:var(--ink-2);padding:10px 14px;font-size:.92rem;font-weight:500;}
.btnGhost:hover{color:var(--ink);}

/* hero */
.topbar{display:flex;justify-content:space-between;align-items:center;padding-block:20px;border-bottom:1px solid var(--rule);}
.mark{font-weight:800;letter-spacing:-.03em;font-size:1.06rem;display:inline-flex;align-items:center;gap:9px;color:var(--ink);text-decoration:none;}
.markGlyph{width:22px;height:22px;border-radius:5px;background:var(--accent);color:var(--accent-ink);display:grid;place-items:center;font-family:var(--v23-mono);font-size:.8rem;font-weight:700;}
.heroGrid{display:grid;grid-template-columns:1.1fr .9fr;gap:clamp(32px,5vw,64px);align-items:start;padding-top:clamp(48px,7vw,88px);}
.heroGrid>*{min-width:0;}
.h1{font-weight:700;letter-spacing:-.038em;line-height:1.01;font-size:clamp(2.3rem,6.1vw,4.5rem);text-wrap:balance;margin:0;}
.h1 .muted{color:var(--muted);}
.h1 .acc{color:var(--accent);}
.heroSub{margin-top:22px;color:var(--ink-2);font-size:clamp(1.05rem,1.7vw,1.32rem);line-height:1.42;max-width:34ch;font-weight:400;}
.hookLine{margin-top:30px;display:grid;grid-template-columns:1fr;gap:6px;border-top:1.5px solid var(--rule-2);border-bottom:1px solid var(--rule);padding-block:18px;}
.hookLbl{font-family:var(--v23-mono),monospace;font-size:.68rem;letter-spacing:.15em;text-transform:uppercase;color:var(--accent);}
.hookTxt{font-weight:600;font-size:clamp(1.05rem,1.7vw,1.28rem);letter-spacing:-.015em;}
.hookTxt b{font-family:var(--v23-mono);color:var(--accent);font-weight:700;}
.hookNote{color:var(--muted);font-size:.85rem;}
.ctaRow{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px;}
.heroChips{margin-top:24px;}

/* question card */
.qcard{background:var(--surface);border:1px solid var(--rule-2);border-radius:12px;overflow:hidden;box-shadow:0 1px 0 var(--rule),0 22px 50px -34px rgba(34,39,43,.4);}
.qhead{display:flex;justify-content:space-between;align-items:center;padding:13px 18px;border-bottom:1px solid var(--rule);background:var(--surface-2);}
.qhead .qt{font-family:var(--v23-mono);font-size:.7rem;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);}
.qbody{padding:20px 18px;}
.qprompt{font-weight:600;font-size:1.06rem;line-height:1.35;letter-spacing:-.01em;}
.opts{margin-top:16px;display:grid;gap:8px;}
.opt{display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:13px 14px;border:1px solid var(--rule-2);border-radius:8px;background:var(--bg);cursor:pointer;font-size:.98rem;font-weight:500;color:var(--ink);transition:border-color .15s,background .15s;font-family:var(--v23-sans);}
.opt:hover:not(:disabled){border-color:var(--ink-2);}
.opt:disabled{cursor:default;}
.optDot{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--rule-2);display:grid;place-items:center;flex:none;font-family:var(--v23-mono);font-size:.72rem;color:var(--muted);}
.opt.correct{border-color:var(--accent);background:var(--tint);}
.opt.correct .optDot{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);}
.opt.wrong{border-color:var(--rule-2);opacity:.6;}
.qprint{border-top:1px solid var(--rule);padding:15px 18px;display:grid;gap:12px;background:var(--surface-2);}
.qprintRow{display:flex;justify-content:space-between;align-items:center;gap:14px;}
.qprintRow .l{font-family:var(--v23-mono);font-size:.82rem;color:var(--ink-2);}
.qprintRow .v{font-family:var(--v23-mono);font-size:.82rem;color:var(--accent);font-weight:600;}
.meterTrack{height:8px;border-radius:6px;background:var(--surface);border:1px solid var(--rule);overflow:hidden;}
.meterFill{height:100%;background:var(--accent);border-radius:6px;width:0;}
.qtoast{font-size:.85rem;color:var(--ink-2);line-height:1.4;}

/* readiness two-col */
.readGrid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--rule-2);border-radius:12px;overflow:hidden;margin-top:38px;}
.readCol{padding:clamp(24px,3.5vw,40px);}
.readCol.l{border-right:1px solid var(--rule);}
.readCol.r{background:var(--tint);}
.readColLbl{font-family:var(--v23-mono);font-size:.7rem;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);}
.readCap{color:var(--muted);font-size:.92rem;margin-top:10px;line-height:1.45;}
.readCol.r .readCap{color:var(--accent);}
.bigPct{font-family:var(--v23-mono);font-weight:700;font-size:clamp(2.6rem,6vw,4rem);letter-spacing:-.03em;margin-top:20px;line-height:1;color:var(--ink-2);}
.bigPctNote{font-family:var(--v23-mono);font-size:.75rem;letter-spacing:.06em;color:var(--muted);text-transform:uppercase;margin-top:8px;}
.dialWrap{display:flex;flex-direction:column;align-items:flex-start;margin-top:18px;}
.dialRing{position:relative;width:210px;height:210px;max-width:100%;}
.dialRing svg{display:block;width:100%;height:100%;}
.dialCenter{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-top:8px;text-align:center;}
.dialReadout{font-family:var(--v23-mono);font-weight:700;font-size:clamp(2.4rem,5vw,3.1rem);letter-spacing:-.03em;color:var(--accent);line-height:1;}
.moat{margin-top:32px;border-top:1.5px solid var(--rule-2);padding-top:20px;display:flex;gap:14px;align-items:flex-start;}
.moatMark{font-family:var(--v23-mono);font-size:.7rem;letter-spacing:.13em;text-transform:uppercase;color:var(--accent);white-space:nowrap;padding-top:3px;}
.moatTxt{font-weight:500;font-size:clamp(1.02rem,1.6vw,1.2rem);letter-spacing:-.01em;line-height:1.4;max-width:52ch;}

/* mechanism */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin-top:38px;border-top:1.5px solid var(--rule-2);}
.step{padding:clamp(22px,2.6vw,30px) clamp(20px,2vw,26px);border-right:1px solid var(--rule);}
.step:last-child{border-right:none;}
.stepN{font-family:var(--v23-mono);font-weight:700;font-size:1.05rem;color:var(--accent);}
.stepT{font-weight:700;font-size:1.14rem;letter-spacing:-.02em;margin-top:14px;line-height:1.2;}
.stepB{color:var(--muted);font-size:.94rem;line-height:1.5;margin-top:10px;}

/* date */
.dateBox{margin-top:38px;border:1px solid var(--rule-2);border-radius:12px;overflow:hidden;background:var(--surface);}
.dateTop{display:grid;grid-template-columns:1fr;gap:14px;padding:clamp(22px,3vw,32px);border-bottom:1px solid var(--rule);}
.dateInput{font-family:var(--v23-mono);font-size:1.05rem;color:var(--ink);background:var(--bg);border:1px solid var(--rule-2);border-radius:8px;padding:14px 16px;width:100%;max-width:280px;color-scheme:light dark;}
.dateInput:focus{outline:2px solid var(--accent);outline-offset:1px;}
.dateLbl{font-family:var(--v23-mono);font-size:.72rem;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);}
.planGrid{display:grid;grid-template-columns:repeat(3,1fr);}
.planCell{padding:clamp(20px,2.6vw,30px);border-right:1px solid var(--rule);}
.planCell:last-child{border-right:none;}
.planVal{font-family:var(--v23-mono);font-weight:700;font-size:clamp(1.8rem,4vw,2.6rem);letter-spacing:-.02em;line-height:1;}
.planValSm{font-size:clamp(1rem,2vw,1.3rem);color:var(--muted);}
.planCellLbl{font-family:var(--v23-mono);font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:10px;}
.intensive{display:inline-block;font-family:var(--v23-mono);font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:var(--accent-ink);background:var(--accent);padding:3px 8px;border-radius:4px;margin-top:12px;}
.dateFrame{padding:15px clamp(22px,3vw,32px);background:var(--tint);color:var(--accent);font-weight:500;font-size:.96rem;}

/* loss dark band */
.lossBand{background:var(--dark);color:var(--dark-cream);border-radius:0;}
.lossInner{padding-block:clamp(84px,12vw,150px);}
.lossTitle{font-weight:700;font-size:clamp(2rem,5.5vw,3.8rem);letter-spacing:-.03em;line-height:1.02;text-wrap:balance;}
.lossTitle .num{font-family:var(--v23-mono);color:#fff;}
.lossRule{border:none;border-top:1px solid var(--dark-rule);margin:34px 0;}
.lossResolve{font-size:clamp(1.1rem,2vw,1.5rem);font-weight:500;letter-spacing:-.01em;}
.lossRef{color:rgba(236,238,232,.62);font-family:var(--v23-mono);font-size:.92rem;margin-top:10px;}
.lossRefNote{color:rgba(236,238,232,.62);font-size:.82rem;margin-top:4px;}
.lossBand .btnSec{color:var(--dark-cream);border-color:var(--dark-rule);}
.lossBand .btnSec:hover{background:var(--dark-panel);border-color:rgba(236,238,232,.4);}

/* pricing */
.priceCard{margin-top:40px;border:1.5px solid var(--rule-2);border-radius:16px;overflow:hidden;background:var(--surface);box-shadow:0 30px 70px -50px rgba(34,39,43,.5);}
.priceHead{padding:clamp(30px,4vw,48px);border-bottom:1px solid var(--rule);display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:24px;}
.priceBig{display:flex;align-items:baseline;gap:8px;}
.priceNum{font-family:var(--v23-mono);font-weight:700;font-size:clamp(4rem,12vw,7rem);letter-spacing:-.04em;line-height:.86;}
.priceCur{font-family:var(--v23-mono);font-weight:700;font-size:clamp(2rem,5vw,3rem);color:var(--accent);}
.priceMeta{text-align:right;}
.priceOnce{font-family:var(--v23-mono);font-size:.95rem;color:var(--muted);}
.priceFrame{font-weight:700;font-size:1.15rem;letter-spacing:-.02em;margin-top:4px;}
.priceFrameNote{color:var(--muted);font-size:.86rem;margin-top:6px;max-width:26ch;margin-left:auto;}
.priceCols{display:grid;grid-template-columns:1.15fr .85fr;}
.pcol{padding:clamp(24px,3vw,38px);}
.pcol.free{border-right:1px solid var(--rule);background:var(--tint);}
.pcolTitle{font-family:var(--v23-mono);font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;font-weight:600;}
.pcol.free .pcolTitle{color:var(--accent);}
.pcol.paid .pcolTitle{color:var(--muted);}
.pli{display:flex;gap:11px;align-items:flex-start;padding-block:11px;border-bottom:1px solid var(--rule);font-size:.98rem;font-weight:500;line-height:1.35;}
.pli:last-child{border-bottom:none;}
.pliMark{flex:none;width:18px;height:18px;border-radius:5px;display:grid;place-items:center;margin-top:1px;}
.pcol.free .pliMark{background:var(--accent);color:var(--accent-ink);}
.pcol.paid .pliMark{background:var(--surface-2);color:var(--ink-2);border:1px solid var(--rule-2);}
.priceFoot{padding:clamp(22px,3vw,32px) clamp(24px,3vw,38px);border-top:1px solid var(--rule);display:grid;gap:18px;}
.negation{font-weight:700;font-size:1.05rem;letter-spacing:-.01em;}
.ctaBig{display:flex;flex-wrap:wrap;gap:12px;}
.failsafe{color:var(--muted);font-size:.9rem;line-height:1.45;max-width:56ch;}
.trustBand{display:flex;flex-wrap:wrap;align-items:center;gap:0;border:1px solid var(--accent);border-radius:8px;overflow:hidden;width:fit-content;max-width:100%;}
.trustItem{font-family:var(--v23-mono);font-size:.8rem;color:var(--accent);padding:9px 15px;border-right:1px solid var(--tint-2);white-space:nowrap;}
.trustItem:last-child{border-right:none;}

/* proof */
.proofGrid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--rule-2);border-radius:12px;overflow:hidden;margin-top:36px;}
.proofCell{padding:clamp(26px,3.4vw,42px) clamp(20px,2.4vw,30px);border-right:1px solid var(--rule);}
.proofCell:last-child{border-right:none;}
.proofVal{font-family:var(--v23-mono);font-weight:700;font-size:clamp(2.2rem,5vw,3.4rem);letter-spacing:-.03em;line-height:1;}
.proofLbl{font-family:var(--v23-mono);font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-top:12px;}
.freshRow{display:flex;align-items:center;gap:12px;margin-top:22px;}
.freshBadge{display:inline-flex;align-items:center;gap:7px;font-family:var(--v23-mono);font-size:.76rem;letter-spacing:.05em;text-transform:uppercase;color:var(--accent);background:var(--tint);border:1px solid var(--tint-2);border-radius:20px;padding:6px 13px;font-weight:600;}
.reservedRow{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;margin-top:26px;padding-block:20px;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);border-top-style:dashed;border-bottom-style:dashed;}
.reservedLbl{font-weight:500;color:var(--ink-2);}
.reservedVal{font-family:var(--v23-mono);font-size:.82rem;color:var(--muted);font-style:italic;text-align:right;}
.retaker{margin-top:26px;color:var(--muted);font-size:.98rem;line-height:1.5;max-width:60ch;}

/* faq */
.faqList{margin-top:34px;border-top:1.5px solid var(--rule-2);}
.faqItem{border-bottom:1px solid var(--rule);}
.faqQ{width:100%;display:flex;justify-content:space-between;align-items:center;gap:20px;padding-block:clamp(18px,2.2vw,24px);background:none;border:none;cursor:pointer;text-align:left;font-family:var(--v23-sans);color:var(--ink);font-weight:600;font-size:clamp(1.02rem,1.6vw,1.16rem);letter-spacing:-.01em;}
.faqQ .chev{flex:none;transition:transform .25s cubic-bezier(.2,.7,.3,1);color:var(--muted);}
.faqQ[aria-expanded="true"] .chev{transform:rotate(180deg);color:var(--accent);}
.faqA{overflow:hidden;height:0;}
.faqAInner{padding-bottom:22px;color:var(--muted);font-size:1rem;line-height:1.6;max-width:68ch;}

/* final + modes */
.finalTitle{font-weight:700;font-size:clamp(2rem,5.5vw,3.6rem);letter-spacing:-.035em;line-height:1.02;text-wrap:balance;}
.finalSub{color:var(--muted);font-size:clamp(1.05rem,1.6vw,1.25rem);margin-top:16px;}
.modeList{margin-top:40px;display:grid;gap:0;border:1px solid var(--rule-2);border-radius:12px;overflow:hidden;}
.modeRow{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:clamp(18px,2.4vw,24px) clamp(20px,2.4vw,26px);border-bottom:1px solid var(--rule);text-decoration:none;color:var(--ink);transition:background .15s;}
.modeRow:last-child{border-bottom:none;}
.modeRow:hover{background:var(--tint);}
.modeMain{font-weight:600;font-size:1.1rem;letter-spacing:-.01em;}
.modeNote{font-family:var(--v23-mono);font-size:.8rem;color:var(--muted);margin-top:3px;}
.modeArrow{color:var(--accent);flex:none;}

/* footer */
.foot{background:var(--surface-2);border-top:1px solid var(--rule);position:relative;overflow:hidden;}
.footWM{position:absolute;left:clamp(-8px,-1vw,0px);bottom:clamp(-14px,-2vw,-8px);font-weight:800;letter-spacing:-.05em;font-size:clamp(4rem,18vw,13rem);line-height:.8;color:var(--ink);opacity:.045;pointer-events:none;user-select:none;white-space:nowrap;}
.footGrid{position:relative;display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:36px;padding-top:clamp(56px,7vw,84px);}
.footCol h4{font-family:var(--v23-mono);font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:600;margin:0 0 14px;}
.footCol a{display:block;color:var(--ink-2);text-decoration:none;font-size:.96rem;padding-block:6px;transition:color .15s;}
.footCol a:hover{color:var(--accent);}
.footMark{font-weight:800;letter-spacing:-.03em;font-size:1.3rem;display:inline-flex;gap:10px;align-items:center;color:var(--ink);}
.footDisc{position:relative;margin-top:clamp(48px,6vw,72px);padding-block:24px 60px;border-top:1px solid var(--rule);display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;}
.footDiscTxt{color:var(--muted);font-size:.84rem;line-height:1.5;max-width:64ch;}
.footRights{font-family:var(--v23-mono);font-size:.8rem;color:var(--muted);}

@media (max-width:860px){
  .heroGrid{grid-template-columns:1fr;gap:34px;}
  .readGrid{grid-template-columns:1fr;}
  .readCol.l{border-right:none;border-bottom:1px solid var(--rule);}
  .steps{grid-template-columns:1fr;}
  .step{border-right:none;border-bottom:1px solid var(--rule);}
  .step:last-child{border-bottom:none;}
  .planGrid{grid-template-columns:1fr;}
  .planCell{border-right:none;border-bottom:1px solid var(--rule);}
  .planCell:last-child{border-bottom:none;}
  .priceCols{grid-template-columns:1fr;}
  .pcol.free{border-right:none;border-bottom:1px solid var(--rule);}
  .proofGrid{grid-template-columns:1fr;}
  .proofCell{border-right:none;border-bottom:1px solid var(--rule);}
  .proofCell:last-child{border-bottom:none;}
  .footGrid{grid-template-columns:1fr;gap:28px;}
  .priceHead{flex-direction:column;align-items:flex-start;}
  .priceMeta{text-align:left;}
  .priceFrameNote{margin-left:0;}
}
@media (prefers-reduced-motion:reduce){
  .v23 *{transition:none!important;}
}
`;

/* ============================ hero question ============================ */
function HeroQuestion() {
  const q = HERO.question;
  const [picked, setPicked] = useState<number | null>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const valRef = useRef<HTMLSpanElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const answered = picked !== null;
  const correct = picked === q.correct;

  useEffect(() => {
    if (picked === null) return;
    const target = correct ? 12 : 5;
    const printEl = printRef.current;
    if (prefersReduced()) {
      if (fillRef.current) fillRef.current.style.width = `${target}%`;
      if (valRef.current) valRef.current.textContent = `+${target}`;
      if (printEl) printEl.style.opacity = "1";
      return;
    }
    const ctx = gsap.context(() => {
      if (printEl) gsap.fromTo(printEl, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
      if (fillRef.current) gsap.fromTo(fillRef.current, { width: "0%" }, { width: `${target}%`, duration: 0.9, ease: "power3.out" });
      const o = { v: 0 };
      gsap.to(o, { v: target, duration: 0.9, ease: "power3.out", onUpdate: () => { if (valRef.current) valRef.current.textContent = `+${Math.round(o.v)}`; } });
    });
    return () => ctx.revert();
  }, [picked, correct]);

  return (
    <div className="qcard" aria-label="Демонстрація: перше питання">
      <div className="qhead">
        <span className="qt">{q.ledgerTitle}</span>
        <span className="qt mono">ПДР</span>
      </div>
      <div className="qbody">
        <p className="qprompt">{q.prompt}</p>
        <div className="opts">
          {q.options.map((opt, i) => {
            const isCorrectOpt = i === q.correct;
            const cls = !answered ? "opt" : isCorrectOpt ? "opt correct" : i === picked ? "opt wrong" : "opt wrong";
            return (
              <button
                key={i}
                className={cls}
                disabled={answered}
                onClick={() => setPicked(i)}
                aria-label={opt}
              >
                <span className="optDot">{answered && isCorrectOpt ? <Check size={13} /> : String.fromCharCode(65 + i)}</span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
      {answered && (
        <div className="qprint" ref={printRef}>
          <div className="qprintRow">
            <span className="l">{q.rowAnswered}</span>
            <span className="v mono" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span className="demoTag">{q.meterDemoTag}</span>
              {q.meterLabel} <span ref={valRef}>+0</span>
            </span>
          </div>
          <div className="meterTrack">
            <div className="meterFill" ref={fillRef} />
          </div>
          <p className="qtoast">{correct ? q.correctToast : q.wrongToast}</p>
        </div>
      )}
    </div>
  );
}

/* ============================ readiness dial ============================ */
function ReadinessDial() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const arcRef = useRef<SVGPathElement>(null);
  const size = 210;
  const stroke = 14;
  const r = (size - stroke) / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;
  const SWEEP = 270; // degrees
  const START = 135; // start angle (bottom-left)

  const polar = (angleDeg: number) => {
    const a = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const arcPath = (frac: number) => {
    const end = START + SWEEP * frac;
    const s = polar(START);
    const e = polar(end);
    const large = SWEEP * frac > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };
  const track = arcPath(1);
  const FINAL = 64;

  useEffect(() => {
    const setVal = (v: number) => {
      if (arcRef.current) arcRef.current.setAttribute("d", arcPath(Math.max(0, Math.min(100, v)) / 100));
      if (readoutRef.current) readoutRef.current.textContent = String(Math.round(v));
    };
    if (prefersReduced()) {
      setVal(FINAL);
      return;
    }
    setVal(0);
    const ctx = gsap.context(() => {
      const o = { v: 0 };
      const tl = gsap.timeline({
        scrollTrigger: { trigger: wrapRef.current, start: "top 78%", once: true },
      });
      // rise, then honestly decay
      tl.to(o, { v: 78, duration: 1.1, ease: "power3.out", onUpdate: () => setVal(o.v) })
        .to(o, { v: FINAL, duration: 1.4, ease: "power2.inOut", onUpdate: () => setVal(o.v) }, "+=0.35");
    }, wrapRef);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dialWrap" ref={wrapRef}>
      <div className="dialRing">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Готовність приблизно ${FINAL} відсотків`}>
          <path d={track} fill="none" stroke="var(--rule-2)" strokeWidth={stroke} strokeLinecap="round" />
          <path ref={arcRef} d={arcPath(FINAL / 100)} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round" />
        </svg>
        <div className="dialCenter">
          <div className="dialReadout"><span ref={readoutRef}>{FINAL}</span><span style={{ fontSize: "0.46em", color: "var(--muted)" }}>%</span></div>
        </div>
      </div>
      <div className="bigPctNote" style={{ marginTop: 8 }}>{READINESS.right.valueNote}</div>
      <p className="readCap" style={{ marginTop: 14 }}>{READINESS.right.decayNote}</p>
    </div>
  );
}

/* ============================ date plan ============================ */
function DatePlan() {
  const [dateStr, setDateStr] = useState("");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minStr = today.toISOString().slice(0, 10);

  let days: number = DATE.fallbackDays;
  let hasDate = false;
  if (dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff >= 0) {
      days = Math.max(1, diff);
      hasDate = true;
    }
  }
  /* A spaced plan is repetition, not «вся база ÷ дні» — cap the per-day preview
     at an honest ceiling so a short horizon never claims an implausible pace. */
  const perDay = Math.min(DATE.perDayCeil, Math.max(12, Math.ceil(STATS.bankCount / days)));
  const intensive = hasDate && days < 7;
  const daysNoun = ukPlural(days, DATE.daysOne, DATE.daysFew, DATE.daysMany);

  return (
    <div className="dateBox">
      <div className="dateTop">
        <label className="dateLbl" htmlFor="v23-date">{DATE.inputLabel}</label>
        <input
          id="v23-date"
          className="dateInput mono"
          type="date"
          min={minStr}
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
        />
        <p className="secSub" style={{ fontSize: "0.9rem", marginTop: 2 }}>
          {hasDate ? DATE.frame : DATE.emptyState}
        </p>
      </div>
      <div className="planGrid">
        <div className="planCell">
          <div className="planVal mono">{days}</div>
          <div className="planCellLbl">{daysNoun} {DATE.daysSuffix}</div>
          {!hasDate && <span className="demoTag" style={{ marginTop: 12 }}>{DATE.estimateTag}</span>}
        </div>
        <div className="planCell">
          <div className="planVal mono">≈{perDay}</div>
          <div className="planCellLbl">{DATE.perDayLabel}</div>
        </div>
        <div className="planCell">
          <div className="planVal planValSm mono">≈{Math.ceil(days / 7)}<span style={{ fontSize: "0.5em" }}> тиж.</span></div>
          <div className="planCellLbl">{DATE.weeksLabel}</div>
          {intensive && <span className="intensive">{DATE.intensiveLabel}</span>}
        </div>
      </div>
      {intensive && (
        <div className="dateFrame">{DATE.intensiveNote}</div>
      )}
    </div>
  );
}

/* ============================ faq item ============================ */
function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const innerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const uid = useId();

  useEffect(() => {
    const el = bodyRef.current;
    const inner = innerRef.current;
    if (!el || !inner) return;
    const target = open ? inner.offsetHeight : 0;
    if (prefersReduced()) {
      el.style.height = open ? "auto" : "0px";
      return;
    }
    const ctx = gsap.context(() => {
      gsap.to(el, { height: target, duration: 0.36, ease: "power3.out" });
    });
    return () => ctx.revert();
  }, [open]);

  return (
    <div className="faqItem">
      <button
        className="faqQ"
        aria-expanded={open}
        aria-controls={uid}
        onClick={() => setOpen((v) => !v)}
      >
        {q}
        <ChevronDown className="chev" size={20} />
      </button>
      <div className="faqA" ref={bodyRef} id={uid} role="region">
        <div className="faqAInner" ref={innerRef}>{a}</div>
      </div>
    </div>
  );
}

/* ============================ reveal helper ============================ */
function useReveal(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (prefersReduced() || !rootRef.current) return;
    const ctx = gsap.context(() => {
      const rows = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      rows.forEach((row) => {
        const kids = row.querySelectorAll<HTMLElement>("[data-r]");
        gsap.from(kids.length ? kids : [row], {
          opacity: 0,
          y: 18,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.04,
          scrollTrigger: { trigger: row, start: "top 82%", once: true },
        });
      });
    }, rootRef);
    return () => ctx.revert();
  }, [rootRef]);
}

/* ============================ page ============================ */
export default function V23Page() {
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);

  return (
    <div className="v23" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ---------- HERO ---------- */}
      <header className="wrap">
        <div className="topbar">
          <Link href={REGISTER_HREF} className="mark">
            <span className="markGlyph">DS</span>
            {BRAND.name}
          </Link>
          <Link href={LOGIN_HREF} className="btn btnGhost">Увійти</Link>
        </div>

        <div className="heroGrid">
          <div data-reveal>
            <h1 className="h1" data-r>
              <Segments parts={heroLine.headline} />
            </h1>
            <p className="heroSub" data-r>{heroLine.sub}</p>

            <div className="hookLine" data-r>
              <span className="hookLbl">{HERO.hookLabel}</span>
              <span className="hookTxt">{hookParts[0]}<b>{STATS.firstPassShort}</b>{hookParts[1]}</span>
              <span className="hookNote">{HERO.hookNote}</span>
            </div>

            <div className="ctaRow" data-r>
              <Link href={REGISTER_HREF} className="btn btnPri">
                {HERO.ctaPrimary} <ArrowRight size={18} />
              </Link>
              <Link href={ANON_TRY_HREF} className="btn btnSec" aria-label="спробувати без реєстрації">
                {HERO.ctaSecondary}
              </Link>
            </div>

            <div className="heroChips" data-r>
              <div className="cells">
                {HERO.chips.map((c) => <span className="cell" key={c}>{c}</span>)}
              </div>
            </div>
          </div>

          <div data-reveal>
            <div data-r><HeroQuestion /></div>
          </div>
        </div>
      </header>

      {/* ---------- ВІДОМІСТЬ 1 — free forever ---------- */}
      <section className="sec">
        <div className="wrapN">
          <h2 className="srOnly">{FREE_LEDGER.h2}</h2>
          <span className="eyebrow">Відомість 1</span>
          <p className="secTitle" style={{ marginTop: 12 }}>{FREE_LEDGER.title}</p>
          <p className="secSub" style={{ marginTop: 12 }}>{FREE_LEDGER.sub}</p>

          <div style={{ marginTop: 32 }} data-reveal>
            <div className="ledgerHead">
              <span className="colLbl">Позиція</span>
              <span className="colLbl">Сума</span>
            </div>
            {FREE_LEDGER.rows.map((row) => (
              <div className={`lrow${(row as { flagship?: boolean }).flagship ? " flag" : ""}`} key={row.label} data-r>
                <div>
                  <div className="llabel">{row.label}</div>
                  <div className="lnote">{row.note}</div>
                </div>
                <div className="stamp">
                  {money(FREE_LEDGER.amount)}
                  <span className="stampNote">{FREE_LEDGER.amountNote}</span>
                </div>
              </div>
            ))}
            <p className="secSub" style={{ marginTop: 20, fontWeight: 600, color: "var(--ink)" }}>{FREE_LEDGER.footnote}</p>
          </div>
        </div>
      </section>

      {/* ---------- ВІДОМІСТЬ 2 — readiness vs % ---------- */}
      <section className="sec" style={{ background: "var(--surface)", borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)" }}>
        <div className="wrapN">
          <h2 className="srOnly">{READINESS.h2}</h2>
          <span className="eyebrow">Відомість 2</span>
          <p className="secTitle" style={{ marginTop: 12 }}>{READINESS.title}</p>
          <p className="secSub" style={{ marginTop: 12 }}>{READINESS.sub}</p>

          <div className="readGrid" data-reveal>
            <div className="readCol l" data-r>
              <span className="readColLbl">{READINESS.left.label}</span>
              <div className="bigPct mono">{READINESS.left.value}</div>
              <div className="bigPctNote">{READINESS.left.valueNote}</div>
              <p className="readCap">{READINESS.left.caption}</p>
              <div style={{ marginTop: 16 }}><span className="demoTag">{READINESS.demoTag}</span></div>
            </div>
            <div className="readCol r" data-r>
              <span className="readColLbl" style={{ color: "var(--accent)" }}>{READINESS.right.label}</span>
              <ReadinessDial />
              <p className="readCap" style={{ marginTop: 4 }}>{READINESS.right.caption}</p>
              <div style={{ marginTop: 12 }}><span className="demoTag">{READINESS.demoTag}</span></div>
            </div>
          </div>

          <div className="moat" data-reveal>
            <span className="moatMark" data-r>Аудит</span>
            <p className="moatTxt" data-r>{READINESS.moat}</p>
          </div>
        </div>
      </section>

      {/* ---------- ПРИМІТКА ДО АУДИТУ — mechanism ---------- */}
      <section className="sec">
        <div className="wrapN">
          <h2 className="srOnly">{MECHANISM.h2}</h2>
          <p className="secTitle">{MECHANISM.title}</p>
          <p className="secSub" style={{ marginTop: 12 }}>{MECHANISM.sub}</p>

          <div className="steps" data-reveal>
            {MECHANISM.steps.map((s) => (
              <div className="step" key={s.n} data-r>
                <span className="stepN mono">{s.n}</span>
                <div className="stepT">{s.title}</div>
                <p className="stepB">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- ТВОЯ ДАТА ---------- */}
      <section className="sec" style={{ background: "var(--surface)", borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)" }}>
        <div className="wrapN">
          <h2 className="srOnly">{DATE.h2}</h2>
          <p className="secTitle">{DATE.title}</p>
          <p className="secSub" style={{ marginTop: 12 }}>{DATE.sub}</p>
          <div data-reveal><div data-r><DatePlan /></div></div>
        </div>
      </section>

      {/* ---------- ВІДОМІСТЬ 3 — loss dark band ---------- */}
      <section className="lossBand">
        <div className="wrapN lossInner" data-reveal>
          <h2 className="srOnly">{LOSS.h2}</h2>
          <span className="eyebrow" data-r style={{ color: "var(--dark-cream)", opacity: 0.6 }}>Відомість 3 · збиток</span>
          <p className="lossTitle" data-r style={{ marginTop: 16 }}>
            <Segments parts={LOSS.lineA} /><br />
            <Segments parts={LOSS.lineB} />
          </p>
          <hr className="lossRule" />
          <p className="lossResolve" data-r>{LOSS.resolve}</p>
          <p className="lossRef mono" data-r>{money(LOSS.reference)}</p>
          <p className="lossRefNote" data-r>{LOSS.referenceNote}</p>
          <div style={{ marginTop: 34 }} data-r>
            <Link href={REGISTER_HREF} className="btn btnSec">{LOSS.cta} <ArrowRight size={18} /></Link>
          </div>
        </div>
      </section>

      {/* ---------- ПІДСУМОК — pricing ---------- */}
      <section className="sec">
        <div className="wrapN">
          <h2 className="srOnly">{PRICING.h2}</h2>
          <span className="eyebrow">Підсумок</span>
          <p className="secTitle" style={{ marginTop: 12 }}>{PRICING.title}</p>

          <div className="priceCard" data-reveal>
            <div className="priceHead" data-r>
              <div className="priceBig">
                <span className="priceNum mono">{PRICING.price}</span>
                <span className="priceCur uah">{PRICING.currency}</span>
              </div>
              <div className="priceMeta">
                <div className="priceOnce mono">{PRICING.once}</div>
                <div className="priceFrame">{PRICING.frame}</div>
                <p className="priceFrameNote">{PRICING.frameNote}</p>
              </div>
            </div>

            <div className="priceCols">
              <div className="pcol free" data-r>
                <span className="pcolTitle">{PRICING.freeTitle}</span>
                <div style={{ marginTop: 14 }}>
                  {PRICING.free.map((f) => (
                    <div className="pli" key={f}>
                      <span className="pliMark"><Check size={12} /></span>{f}
                    </div>
                  ))}
                </div>
              </div>
              <div className="pcol paid" data-r>
                <span className="pcolTitle">{PRICING.paidTitle}</span>
                <div style={{ marginTop: 14 }}>
                  {PRICING.paid.map((p) => (
                    <div className="pli" key={p}>
                      <span className="pliMark"><Check size={12} /></span>{p}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="priceFoot" data-r>
              <div className="negation">{PRICING.negation}</div>
              <div className="ctaBig">
                <Link href={REGISTER_HREF} className="btn btnPri">{PRICING.cta} <ArrowRight size={18} /></Link>
                <Link href={ANON_TRY_HREF} className="btn btnSec" aria-label="спершу безкоштовно, без реєстрації">{PRICING.ctaFree}</Link>
              </div>
              <div className="trustBand">
                {PRICING.trustBand.map((t) => <span className="trustItem" key={t}>{t}</span>)}
              </div>
              <p className="failsafe">{PRICING.failsafe}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- БАЗА — proof ---------- */}
      <section className="sec" style={{ background: "var(--surface)", borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)" }}>
        <div className="wrapN">
          <h2 className="srOnly">{PROOF.h2}</h2>
          <p className="secTitle">{PROOF.title}</p>
          <p className="secSub" style={{ marginTop: 12 }}>{PROOF.sub}</p>

          <div className="proofGrid" data-reveal>
            {PROOF.rows.map((row) => (
              <div className="proofCell" key={row.label} data-r>
                <div className="proofVal mono">{row.value}</div>
                <div className="proofLbl">{row.label}</div>
              </div>
            ))}
          </div>

          <div className="freshRow" data-reveal>
            <span className="freshBadge" data-r><Check size={13} /> {PROOF.freshBadge}</span>
          </div>

          <div className="reservedRow" data-reveal>
            <span className="reservedLbl" data-r>{PROOF.reserved.label}</span>
            <span className="reservedVal" data-r>{PROOF.reserved.value}</span>
          </div>

          <p className="retaker">{PROOF.retaker}</p>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="sec">
        <div className="wrapN">
          <h2 className="srOnly">{FAQ.h2}</h2>
          <p className="secTitle">{FAQ.title}</p>
          <div className="faqList">
            {FAQ.items.map((it, i) => (
              <FaqItem key={it.q} q={it.q} a={it.a} defaultOpen={i === 0} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FINAL CTA + modes ---------- */}
      <section className="sec" style={{ background: "var(--surface)", borderTop: "1px solid var(--rule)" }}>
        <div className="wrapN" data-reveal>
          <h2 className="finalTitle" data-r>{FINAL.title}</h2>
          <p className="finalSub" data-r>{FINAL.sub}</p>
          <div className="ctaRow" data-r style={{ marginTop: 28 }}>
            <Link href={REGISTER_HREF} className="btn btnPri">{FINAL.ctaPrimary} <ArrowRight size={18} /></Link>
            <Link href={ANON_TRY_HREF} className="btn btnSec" aria-label="спробувати без реєстрації">{FINAL.ctaSecondary}</Link>
          </div>

          <div style={{ marginTop: 44 }} data-r>
            <span className="colLbl">{FINAL.modesLabel}</span>
            <div className="modeList" style={{ marginTop: 14 }}>
              {FINAL.modes.map((m) => (
                <Link href={m.href} className="modeRow" key={m.label}>
                  <div>
                    <div className="modeMain">{m.label}</div>
                    <div className="modeNote">{m.note}</div>
                  </div>
                  <ArrowRight className="modeArrow" size={20} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="foot">
        <div className="wrap">
          <div className="footWM" aria-hidden>{FOOTER.wordmark}</div>
          <div className="footGrid">
            <div className="footCol">
              <div className="footMark"><span className="markGlyph">DS</span>{BRAND.name}</div>
              <p className="footDiscTxt" style={{ marginTop: 16 }}>{BRAND.tagline}.</p>
            </div>
            {FOOTER.columns.map((col) => (
              <div className="footCol" key={col.title}>
                <h4>{col.title}</h4>
                {col.links.map((l) => (
                  <Link href={l.href} key={l.label}>{l.label}</Link>
                ))}
              </div>
            ))}
          </div>
          <div className="footDisc">
            <p className="footDiscTxt">{FOOTER.disclaimer}</p>
            <span className="footRights mono">{FOOTER.rights}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
