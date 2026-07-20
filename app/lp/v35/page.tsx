"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, ArrowRight, ArrowUpRight } from "lucide-react";
import { COPY, NAV, CTA } from "./copy";

/* ══════════════════════════════════════════════════════════════════════════
   v35 «Школа Radiant» — premium-gradient SaaS polish, our own craft.
   Replicates the Radiant anatomy 1:1 in section order + rhythm:
     nav · gradient hero · quiet proof row · light bento grid · dark inset
     bento band · photo-card carousel · 2-tier pricing · gradient CTA close ·
     FAQ · footer.
   Our system (nothing fetched/transcribed):
     · a COOL pastel gradient wash — periwinkle · violet · sky · mint — on a
       cool near-white ground (distinct from v34's warm terracotta)
     · Onest grotesk at tight display tracking (--font-onest)
     · bento cells holding REAL product UI edge-to-edge inside soft-ringed
       rounded cards — no browser chrome (v34's device is our departure)
     · a deep cool-ink inset band for contrast, with a gradient echo
   Scoped .v35. Motion lives in gsap.matchMedia with a reduced-motion branch;
   scroll reveals are transform-only so no section ever ships blank.
   ══════════════════════════════════════════════════════════════════════════ */

const IMG = "/restyled-live";

const STYLES = `
.v35{
  --bg:#FAFBFF; --bg2:#F1F3FC; --surface:#FFFFFF;
  --ink:#181A2E; --ink-soft:#2E3252; --muted:#565B79;
  --line:#E7E9F5; --line-soft:#EFF1FB;
  --accent:#5B37D4; --accent-600:#4E2CC4; --accent-700:#3F22A6;
  --accent-tint:#EEEAFC;
  --peri:#A9B6FF; --violet:#C9A6FF; --sky:#A6DBFF; --mint:#A6F0D8;
  --band:#15172B; --band-2:#1E2140; --band-line:rgba(180,190,255,.14);
  --band-ink:#EEF0FF; --band-muted:#A9AFD6;
  --r:16px; --r-sm:11px; --r-lg:26px; --r-xl:34px;
  --z-nav:60; --z-skip:80;
  background:var(--bg); color:var(--ink);
  font-family:var(--font-onest),system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
  letter-spacing:-0.012em; line-height:1.6;
  overflow-x:clip;
}
.v35 *{box-sizing:border-box;}
.v35 ::selection{background:rgba(91,55,212,.16);}
.v35 h1,.v35 h2,.v35 h3{
  font-weight:800; letter-spacing:-0.035em; line-height:1.02;
  text-wrap:balance; color:var(--ink); margin:0;
}
.v35 p{margin:0; text-wrap:pretty;}
.v35 a{color:inherit;text-decoration:none;}
.v35 .num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1;}
.v35 .sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}
.v35 .skip{position:fixed;top:12px;left:12px;z-index:var(--z-skip);background:var(--ink);color:#fff;font-weight:700;
  padding:10px 16px;border-radius:12px;transform:translateY(-200%);transition:transform .18s;}
.v35 .skip:focus{transform:translateY(0);}
.v35 :focus-visible{outline:2.5px solid var(--accent);outline-offset:3px;border-radius:8px;}

/* shell */
.v35 .wrap{max-width:1200px;margin:0 auto;padding:0 24px;}
.v35 section{position:relative;}

/* eyebrow — used as a small named label INSIDE bento cells (not above every section) */
.v35 .eyebrow{font-size:.72rem;font-weight:700;letter-spacing:.02em;color:var(--accent);
  text-transform:uppercase;display:inline-flex;align-items:center;gap:7px;}
.v35 .eyebrow::before{content:"";width:16px;height:2px;border-radius:2px;
  background:linear-gradient(90deg,var(--accent),var(--peri));}

/* buttons */
.v35 .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:1rem;
  border-radius:999px;padding:14px 26px;cursor:pointer;border:1px solid transparent;
  transition:transform .16s cubic-bezier(.2,.7,.3,1),box-shadow .22s,background .2s,color .2s,border-color .2s;
  white-space:nowrap;font-family:inherit;}
.v35 .btn:active{transform:translateY(1px);}
.v35 .btn-primary{background:var(--accent-600);color:#fff;
  box-shadow:0 10px 28px -12px rgba(78,44,196,.85),inset 0 1px 0 rgba(255,255,255,.18);}
.v35 .btn-primary:hover{background:var(--accent-700);transform:translateY(-1px);
  box-shadow:0 16px 34px -12px rgba(78,44,196,.9),inset 0 1px 0 rgba(255,255,255,.2);}
.v35 .btn-ghost{background:var(--surface);color:var(--ink);border-color:var(--line);
  box-shadow:0 1px 0 rgba(24,26,46,.02);}
.v35 .btn-ghost:hover{border-color:#D6DAF0;transform:translateY(-1px);box-shadow:0 12px 26px -18px rgba(24,26,46,.5);}
.v35 .btn-onband{background:rgba(255,255,255,.96);color:var(--ink);}
.v35 .btn-onband:hover{background:#fff;transform:translateY(-1px);}
.v35 .btn-sm{padding:10px 18px;font-size:.92rem;}
.v35 .btn svg{width:17px;height:17px;}
.v35 .link-arrow{display:inline-flex;align-items:center;gap:6px;font-weight:700;color:var(--accent-700);}
.v35 .link-arrow svg{width:15px;height:15px;transition:transform .18s;}
.v35 .link-arrow:hover svg{transform:translate(2px,-2px);}

/* ── wordmark ── */
.v35 .brand{display:inline-flex;align-items:center;gap:11px;font-weight:800;font-size:1.12rem;letter-spacing:-0.03em;white-space:nowrap;color:var(--ink);}
.v35 .brand-mark{width:30px;height:30px;border-radius:9px;position:relative;flex:0 0 auto;
  background:conic-gradient(from 210deg at 50% 50%,var(--sky),var(--peri),var(--violet),var(--accent),var(--sky));
  box-shadow:0 6px 16px -8px rgba(91,55,212,.7),inset 0 1px 0 rgba(255,255,255,.5);}
.v35 .brand-mark::after{content:"";position:absolute;inset:7px;border-radius:5px;background:var(--surface);
  box-shadow:inset 0 1px 2px rgba(24,26,46,.12);}
.v35 .brand-mark::before{content:"";position:absolute;inset:0;border-radius:9px;z-index:2;
  background:radial-gradient(circle at 50% 50%,var(--accent) 0 4px,transparent 5px);}

/* ── nav ── */
.v35 .nav{position:sticky;top:0;z-index:var(--z-nav);background:rgba(250,251,255,.72);
  backdrop-filter:saturate(160%) blur(14px);-webkit-backdrop-filter:saturate(160%) blur(14px);
  border-bottom:1px solid transparent;transition:border-color .25s,box-shadow .25s,background .25s;}
.v35 .nav.scrolled{border-color:var(--line);box-shadow:0 8px 30px -22px rgba(24,26,46,.5);background:rgba(250,251,255,.86);}
.v35 .nav-in{display:flex;align-items:center;gap:22px;height:72px;}
.v35 .nav-links{display:flex;gap:4px;margin-left:14px;}
.v35 .nav-link{padding:9px 14px;border-radius:10px;font-weight:600;font-size:.94rem;color:var(--ink-soft);transition:color .18s,background .18s;}
.v35 .nav-link:hover{color:var(--ink);background:var(--line-soft);}
.v35 .nav-right{margin-left:auto;display:flex;align-items:center;gap:10px;}
.v35 .nav-login{font-weight:600;font-size:.94rem;color:var(--ink-soft);padding:9px 12px;border-radius:10px;transition:color .18s,background .18s;}
.v35 .nav-login:hover{color:var(--ink);background:var(--line-soft);}
/* nav CTA shows its full label by default; a short label swaps in on narrow phones (≤720) so it never clips */
.v35 .nav-cta-short{display:none;}

/* ── gradient wash primitives ── */
.v35 .blob{position:absolute;border-radius:50%;filter:blur(64px);opacity:.62;pointer-events:none;z-index:0;
  will-change:transform;}
.v35 .grain{position:absolute;inset:0;pointer-events:none;z-index:1;opacity:.5;
  background:radial-gradient(120% 90% at 50% -8%,rgba(255,255,255,0) 40%,var(--bg) 82%);}

/* ── hero ── */
.v35 .hero{position:relative;overflow:hidden;padding:66px 0 46px;isolation:isolate;}
.v35 .hero-wash{position:absolute;inset:0;z-index:0;overflow:hidden;}
.v35 .hero-in{position:relative;z-index:2;max-width:960px;}
.v35 .hero-kicker{display:inline-flex;align-items:center;gap:9px;font-size:.85rem;font-weight:600;
  color:var(--ink-soft);background:rgba(255,255,255,.7);border:1px solid var(--line);
  padding:7px 15px 7px 12px;border-radius:999px;margin-bottom:24px;backdrop-filter:blur(6px);}
.v35 .hero-kicker .dot{width:8px;height:8px;border-radius:50%;
  background:linear-gradient(135deg,var(--accent),var(--sky));box-shadow:0 0 0 4px rgba(91,55,212,.12);}
.v35 .hero h1{font-size:clamp(2.7rem,7.4vw,5.6rem);line-height:.98;letter-spacing:-0.045em;}
.v35 .hero h1 .l2{color:var(--accent);}
.v35 .hero-sub{margin-top:26px;font-size:clamp(1.06rem,1.7vw,1.28rem);color:var(--muted);
  max-width:640px;line-height:1.55;font-weight:450;}
.v35 .hero-cta{margin-top:34px;display:flex;flex-wrap:wrap;gap:13px;align-items:center;}
.v35 .hero-note{margin-top:18px;font-size:.9rem;color:var(--muted);display:flex;align-items:center;gap:8px;}
.v35 .hero-note .spark{width:16px;height:16px;flex:0 0 auto;color:var(--accent);}

/* ── proof row ── */
.v35 .proof{position:relative;z-index:2;padding:8px 0 20px;}
.v35 .proof-lead{font-size:.82rem;font-weight:600;letter-spacing:.02em;text-transform:uppercase;color:var(--muted);margin-bottom:18px;}
.v35 .proof-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;
  background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);
  padding:26px 30px;box-shadow:0 24px 60px -46px rgba(24,26,46,.5);}
.v35 .proof-cell{display:flex;flex-direction:column;gap:6px;position:relative;padding-left:2px;}
.v35 .proof-cell+.proof-cell::before{content:"";position:absolute;left:-7px;top:6px;bottom:6px;width:1px;background:var(--line);}
.v35 .proof-val{font-size:clamp(1.8rem,3.4vw,2.5rem);font-weight:800;letter-spacing:-0.04em;line-height:1;}
.v35 .proof-lbl{font-size:.86rem;color:var(--muted);white-space:pre-line;line-height:1.35;font-weight:500;}

/* ── section head ── */
.v35 .sec-head{max-width:660px;margin-bottom:38px;}
.v35 .sec-head h2{font-size:clamp(1.9rem,3.8vw,3rem);letter-spacing:-0.04em;line-height:1.03;}
.v35 .sec-head .lead{margin-top:16px;font-size:1.08rem;color:var(--muted);line-height:1.55;}

/* ── bento (shared cell) ── */
.v35 .cell{position:relative;border-radius:var(--r-xl);border:1px solid var(--line);
  background:var(--surface);overflow:hidden;display:flex;flex-direction:column;
  box-shadow:0 30px 70px -54px rgba(24,26,46,.6);}
.v35 .cell-pad{padding:26px 26px 20px;}
.v35 .cell .eyebrow{margin-bottom:12px;}
.v35 .cell h3{font-size:1.24rem;letter-spacing:-0.03em;line-height:1.12;}
.v35 .cell .cbody{margin-top:9px;font-size:.96rem;color:var(--muted);line-height:1.5;}
/* media window — the UI capture fills the cell edge-to-edge (cover) */
.v35 .cell-shot{position:relative;margin-top:auto;flex:1 1 auto;min-height:150px;
  border-top:1px solid var(--line-soft);background:#F7F8FE;}
.v35 .cell-shot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:left top;}

/* bento #1 layout — every landscape capture lives in a WIDE cell */
.v35 .bento1{display:grid;gap:16px;grid-template-columns:1.5fr 1fr;
  grid-template-rows:342px 244px;
  grid-template-areas:
    "runner side"
    "dial   map";}
.v35 .b-runner{grid-area:runner;}
.v35 .b-side{grid-area:side;}
.v35 .b-dial{grid-area:dial;}
.v35 .b-map{grid-area:map;}
.v35 .b-runner .cell-shot img{object-position:left top;}
.v35 .b-dial{background:linear-gradient(180deg,#fff,#F8F6FF);}
.v35 .b-dial .cell-shot{background:#F6F4FF;}
.v35 .b-dial .cell-shot img{object-fit:cover;object-position:center center;}
.v35 .b-map .cell-shot img{object-position:left top;}
/* concise cells (dial/map) — eyebrow + claim only, image gets the room */
.v35 .b-dial .cell-pad,.v35 .b-map .cell-pad{padding:22px 24px 16px;}
/* side panel — anon-try text cell with a soft gradient wash */
.v35 .b-side{background:
  radial-gradient(130% 120% at 100% 0%,rgba(169,182,255,.22),transparent 58%),
  radial-gradient(130% 130% at 0% 100%,rgba(166,240,216,.18),transparent 55%),var(--surface);}
.v35 .b-side .cell-pad{padding:28px 26px;display:flex;flex-direction:column;height:100%;}
.v35 .b-side .cbig{font-size:clamp(1.4rem,2vw,1.75rem);font-weight:800;letter-spacing:-0.035em;
  margin-top:12px;line-height:1.1;}
.v35 .b-side .side-cta{margin-top:auto;padding-top:18px;}

/* ── dark inset band ── */
.v35 .band-wrap{padding:26px 0;}
.v35 .band{position:relative;overflow:hidden;border-radius:var(--r-xl);
  background:radial-gradient(120% 130% at 12% -10%,var(--band-2),var(--band) 55%);
  color:var(--band-ink);padding:clamp(34px,4vw,60px);isolation:isolate;
  box-shadow:0 50px 90px -50px rgba(21,23,43,.9);}
.v35 .band-echo{position:absolute;z-index:0;border-radius:50%;filter:blur(70px);opacity:.5;pointer-events:none;}
.v35 .band-in{position:relative;z-index:2;}
.v35 .band .kick{font-size:.74rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;
  color:var(--peri);display:inline-flex;align-items:center;gap:8px;}
.v35 .band .kick::before{content:"";width:16px;height:2px;border-radius:2px;background:linear-gradient(90deg,var(--peri),var(--sky));}
.v35 .band h2{color:#fff;font-size:clamp(1.85rem,3.6vw,2.8rem);letter-spacing:-0.04em;margin-top:16px;max-width:640px;}
.v35 .band .band-lead{margin-top:14px;color:var(--band-muted);font-size:1.05rem;max-width:600px;line-height:1.55;}
/* every intel capture is LANDSCAPE (review 1032×445 · exam 660×480 · mistakes 640×360),
   so no cell may be a tall portrait slot — review spans a wide top band, exam + mistakes
   share the lower row as two landscape-friendly cells. */
.v35 .bento2{margin-top:40px;display:grid;gap:16px;grid-template-columns:1fr 1fr;
  grid-template-rows:230px 312px;
  grid-template-areas:
    "review   review"
    "exam     mist";}
.v35 .d-review{grid-area:review;}
.v35 .d-exam{grid-area:exam;}
.v35 .d-mist{grid-area:mist;}
.v35 .dcell{position:relative;border-radius:var(--r-lg);overflow:hidden;display:flex;flex-direction:column;
  background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.02));
  border:1px solid var(--band-line);box-shadow:0 30px 60px -46px rgba(0,0,0,.8);}
.v35 .dcell-pad{padding:24px 24px 14px;}
.v35 .dcell .eyebrow{color:var(--sky);}
.v35 .dcell .eyebrow::before{background:linear-gradient(90deg,var(--sky),var(--peri));}
.v35 .dcell h3{color:#fff;font-size:1.16rem;letter-spacing:-0.03em;line-height:1.14;}
.v35 .dcell .cbody{margin-top:9px;color:var(--band-muted);font-size:.92rem;line-height:1.48;}
/* dark media window — capture fills the cell edge-to-edge */
.v35 .dcell-shot{position:relative;margin-top:auto;flex:1 1 auto;min-height:120px;
  background:#0F1122;border-top:1px solid var(--band-line);overflow:hidden;}
.v35 .dcell-shot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top center;}
/* exam sits in a WIDE landscape cell now — top keeps the «1 з 20» + timer «19:46» header strip */
.v35 .d-exam .dcell-shot img{object-position:top center;}
/* mistakes: the «ПДР п. …» citation lives in the lower band of the capture — anchor bottom so it's legible */
.v35 .d-mist .dcell-shot img{object-position:center bottom;}

/* ── carousel ── */
.v35 .car-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:30px;}
.v35 .car-hint{font-size:.86rem;font-weight:600;color:var(--muted);white-space:nowrap;}
.v35 .car-scroll{display:grid;grid-auto-flow:column;grid-auto-columns:clamp(258px,78vw,320px);gap:18px;
  overflow-x:auto;scroll-snap-type:x mandatory;padding:6px 24px 22px;margin:0 -24px;
  scrollbar-width:thin;scrollbar-color:var(--peri) transparent;-webkit-overflow-scrolling:touch;}
.v35 .car-scroll::-webkit-scrollbar{height:8px;}
.v35 .car-scroll::-webkit-scrollbar-thumb{background:var(--line);border-radius:8px;}
.v35 .qcard{scroll-snap-align:start;border-radius:var(--r-lg);overflow:hidden;background:var(--surface);
  border:1px solid var(--line);box-shadow:0 26px 60px -50px rgba(24,26,46,.7);display:flex;flex-direction:column;
  transition:transform .2s cubic-bezier(.2,.7,.3,1),box-shadow .2s;}
.v35 .qcard:hover{transform:translateY(-4px);box-shadow:0 34px 70px -46px rgba(24,26,46,.7);}
.v35 .qcard-img{position:relative;aspect-ratio:5/3;background:
  linear-gradient(135deg,var(--sky),var(--peri) 60%,var(--violet));overflow:hidden;}
.v35 .qcard-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.v35 .qcard-body{padding:18px 20px 22px;display:flex;flex-direction:column;gap:9px;flex:1;}
.v35 .qcard-topic{display:inline-flex;align-self:flex-start;font-size:.72rem;font-weight:700;
  letter-spacing:.02em;text-transform:uppercase;color:var(--accent-700);
  background:var(--accent-tint);padding:5px 10px;border-radius:999px;}
.v35 .qcard-q{font-size:1.0rem;color:var(--ink);font-weight:500;line-height:1.42;letter-spacing:-0.015em;}
.v35 .car-note{margin-top:16px;font-size:.86rem;color:var(--muted);max-width:640px;}

/* ── pricing ── */
.v35 .price-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:stretch;max-width:940px;margin:0 auto;}
.v35 .pcard{position:relative;border-radius:var(--r-xl);background:var(--surface);border:1px solid var(--line);
  padding:34px 32px;display:flex;flex-direction:column;box-shadow:0 30px 70px -56px rgba(24,26,46,.5);}
.v35 .pcard.feat{border:none;padding:0;background:transparent;box-shadow:none;}
.v35 .feat-ring{position:relative;border-radius:var(--r-xl);padding:2px;
  background:linear-gradient(135deg,var(--sky),var(--peri) 34%,var(--violet) 66%,var(--accent));
  box-shadow:0 34px 80px -46px rgba(91,55,212,.75);height:100%;}
.v35 .feat-inner{border-radius:calc(var(--r-xl) - 2px);background:var(--surface);
  padding:34px 32px;display:flex;flex-direction:column;height:100%;position:relative;overflow:hidden;}
.v35 .feat-inner::before{content:"";position:absolute;top:-40%;right:-20%;width:70%;height:80%;border-radius:50%;
  background:radial-gradient(circle,rgba(169,182,255,.28),transparent 70%);filter:blur(24px);pointer-events:none;}
.v35 .pbadge{position:absolute;top:16px;right:18px;font-size:.72rem;font-weight:700;letter-spacing:.01em;
  color:var(--accent-700);background:var(--accent-tint);padding:6px 12px;border-radius:999px;z-index:2;}
.v35 .pname{font-size:1.02rem;font-weight:700;color:var(--ink-soft);position:relative;z-index:2;}
.v35 .pprice{display:flex;align-items:baseline;gap:9px;margin-top:12px;position:relative;z-index:2;}
.v35 .pprice .amt{font-size:clamp(2.6rem,4vw,3.2rem);font-weight:800;letter-spacing:-0.05em;line-height:1;}
.v35 .pprice .pnote{font-size:.92rem;color:var(--muted);font-weight:500;}
.v35 .pcta{margin-top:22px;position:relative;z-index:2;}
.v35 .pcta .btn{width:100%;}
.v35 .plist{list-style:none;margin:24px 0 0;padding:22px 0 0;border-top:1px solid var(--line);
  display:flex;flex-direction:column;gap:13px;position:relative;z-index:2;}
.v35 .plist li{display:flex;gap:11px;align-items:flex-start;font-size:.97rem;color:var(--ink-soft);line-height:1.4;}
.v35 .plist .tick{flex:0 0 auto;width:21px;height:21px;border-radius:50%;display:grid;place-items:center;margin-top:1px;
  background:var(--accent-tint);color:var(--accent-700);}
.v35 .plist .tick svg{width:12px;height:12px;stroke-width:3.4;}
.v35 .feat-inner .plist .tick{background:linear-gradient(135deg,var(--accent),var(--peri));color:#fff;}
.v35 .pfine{margin-top:20px;font-size:.86rem;color:var(--muted);line-height:1.5;position:relative;z-index:2;}
.v35 .pfine strong{color:var(--ink-soft);font-weight:700;}

/* ── CTA close ── */
.v35 .close-wrap{padding:30px 0 8px;}
.v35 .close{position:relative;overflow:hidden;border-radius:var(--r-xl);padding:clamp(44px,5.5vw,80px) 28px;text-align:center;
  background:radial-gradient(120% 140% at 50% 0%,#F4F1FF,var(--surface) 60%);
  border:1px solid var(--line);box-shadow:0 40px 90px -60px rgba(91,55,212,.55);isolation:isolate;}
.v35 .close-echo{position:absolute;z-index:0;border-radius:50%;filter:blur(64px);opacity:.55;pointer-events:none;}
.v35 .close-in{position:relative;z-index:2;max-width:620px;margin:0 auto;}
.v35 .close h2{font-size:clamp(2rem,4.4vw,3.2rem);letter-spacing:-0.045em;line-height:1.02;}
.v35 .close-sub{margin-top:16px;font-size:1.1rem;color:var(--muted);line-height:1.5;}
.v35 .close-cta{margin-top:30px;display:flex;flex-wrap:wrap;gap:13px;justify-content:center;}
.v35 .close-note{margin-top:18px;font-size:.88rem;color:var(--muted);}

/* ── FAQ ── */
.v35 .faq-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 28px;}
.v35 .faq-item{padding:22px 4px 22px 0;border-top:1px solid var(--line);}
.v35 .faq-item h3{font-size:1.06rem;letter-spacing:-0.02em;line-height:1.3;}
.v35 .faq-item p{margin-top:9px;font-size:.96rem;color:var(--muted);line-height:1.55;}

/* ── footer ── */
.v35 .foot{margin-top:40px;border-top:1px solid var(--line);padding:44px 0 40px;background:var(--bg2);}
.v35 .foot-top{display:flex;justify-content:space-between;gap:26px;flex-wrap:wrap;align-items:flex-start;}
.v35 .foot-tag{max-width:340px;font-size:.96rem;color:var(--muted);margin-top:14px;line-height:1.5;}
.v35 .foot-links{display:flex;gap:26px;flex-wrap:wrap;}
.v35 .foot-links a{font-size:.94rem;font-weight:600;color:var(--ink-soft);}
.v35 .foot-links a:hover{color:var(--accent-700);}
.v35 .foot-legal{margin-top:30px;padding-top:22px;border-top:1px solid var(--line);
  display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.v35 .foot-disc{font-size:.82rem;color:var(--muted);max-width:760px;line-height:1.5;}
.v35 .foot-copy{font-size:.82rem;color:var(--muted);white-space:nowrap;}

/* ── section vertical rhythm ── */
.v35 .pad{padding:clamp(56px,7vw,104px) 0;}
.v35 .pad-sm{padding:clamp(30px,4vw,54px) 0;}

/* ── responsive ── */
@media (max-width:940px){
  /* brand + login + CTA must fit down to 390px — links collapse here so the primary CTA never clips */
  .v35 .nav-links{display:none;}
  /* dial capture is a wide 1032×300 strip — give it the full row so the honest-state sentence stays whole */
  .v35 .bento1{grid-template-columns:1fr 1fr;grid-template-rows:300px 208px 240px;
    grid-template-areas:"runner runner" "dial dial" "map side";}
  .v35 .bento2{grid-template-columns:1fr 1fr;grid-template-rows:196px 264px;
    grid-template-areas:"review review" "exam mist";}
  .v35 .faq-grid{grid-template-columns:1fr;gap:0;}
}
@media (max-width:720px){
  /* wordmark + compact CTA only; login moves to the footer, CTA shortens (see .nav-cta-*) */
  .v35 .nav-login{display:none;}
  .v35 .nav-cta-full{display:none;}
  .v35 .nav-cta-short{display:inline;}
  .v35 .nav-right .btn-sm{padding:9px 15px;}
  .v35 .proof-grid{grid-template-columns:1fr 1fr;gap:22px 16px;padding:24px;}
  .v35 .proof-cell+.proof-cell::before{display:none;}
  .v35 .proof-cell:nth-child(n+3){padding-top:20px;border-top:1px solid var(--line);}
  .v35 .bento1{grid-template-columns:1fr;grid-template-rows:auto;
    grid-template-areas:"runner" "side" "dial" "map";}
  .v35 .bento1 .cell{min-height:300px;}
  .v35 .b-side{min-height:auto;}
  .v35 .bento2{grid-template-columns:1fr;grid-template-rows:auto;
    grid-template-areas:"review" "exam" "mist";}
  .v35 .bento2 .dcell{min-height:300px;}
  .v35 .price-grid{grid-template-columns:1fr;}
  .v35 .hero{padding-top:48px;}
}
@media (max-width:420px){
  .v35 .proof-grid{grid-template-columns:1fr;}
  .v35 .proof-cell:nth-child(n+2){padding-top:18px;border-top:1px solid var(--line);}
}

/* ── motion defaults — everything visible; JS enhances only ── */
@media (prefers-reduced-motion:reduce){
  .v35 *{scroll-behavior:auto!important;}
}
`;

// ── small icon (info spark) ──
function Spark() {
  return (
    <svg className="spark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v3M12 18v3M4.2 7.5l2.1 1.2M17.7 15.3l2.1 1.2M4.2 16.5l2.1-1.2M17.7 8.7l2.1-1.2"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.4" fill="currentColor" />
    </svg>
  );
}

export default function V35Page() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  // nav scroll state
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // motion — all inside gsap.matchMedia with a reduced-motion branch.
  // Reveals are TRANSFORM-ONLY (opacity stays 1) so no section ever ships blank
  // if a scroll trigger never fires (headless / hidden tab). The hero timeline is
  // load-based (above the fold) and may fade.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const { motion } = context.conditions as { motion: boolean; reduced: boolean };
          if (!motion) return; // reduced: leave the CSS-visible defaults untouched

          // hero load-in (opacity ok — guaranteed to run above the fold)
          const heroBits = gsap.utils.toArray<HTMLElement>("[data-hero]");
          gsap.set(heroBits, { opacity: 0, y: 22 });
          gsap.to(heroBits, {
            opacity: 1, y: 0, duration: 0.72, ease: "power3.out", stagger: 0.08, delay: 0.05,
          });

          // gentle float on the gradient blobs
          gsap.utils.toArray<HTMLElement>("[data-float]").forEach((el, i) => {
            gsap.to(el, {
              y: i % 2 ? 26 : -22, x: i % 2 ? -18 : 16,
              duration: 9 + i * 1.6, ease: "sine.inOut", yoyo: true, repeat: -1,
            });
          });

          // scroll reveals — transform only, opacity stays 1 (never blank)
          gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
            gsap.from(el, {
              y: 26, duration: 0.7, ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 90%", once: true },
            });
          });

          // staggered children reveal — transform only
          gsap.utils.toArray<HTMLElement>("[data-reveal-group]").forEach((group) => {
            const kids = group.querySelectorAll<HTMLElement>("[data-reveal-item]");
            gsap.from(kids, {
              y: 30, duration: 0.66, ease: "power3.out", stagger: 0.08,
              scrollTrigger: { trigger: group, start: "top 85%", once: true },
            });
          });

          requestAnimationFrame(() => ScrollTrigger.refresh());
        }
      );
    }, root);

    return () => ctx.revert();
  }, []);

  const C = COPY;

  return (
    <div className="v35" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <a href="#main" className="skip">Перейти до вмісту</a>

      {/* ── NAV ── */}
      <nav className={`nav${scrolled ? " scrolled" : ""}`} aria-label="Головна навігація">
        <div className="wrap nav-in">
          <Link href="/" className="brand" aria-label={`${C.brand} — на головну`}>
            <span className="brand-mark" aria-hidden="true" />
            {C.brand}
          </Link>
          <div className="nav-links">
            {NAV.links.map((l) => (
              <a key={l.href} href={l.href} className="nav-link">{l.label}</a>
            ))}
          </div>
          <div className="nav-right">
            <Link href={CTA.login.href} className="nav-login">{CTA.login.label}</Link>
            <Link href={CTA.free.href} className="btn btn-primary btn-sm" aria-label={CTA.free.label}>
              <span className="nav-cta-full">{CTA.free.label}</span>
              <span className="nav-cta-short" aria-hidden="true">Почати</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </nav>

      <main id="main">
        {/* ── HERO ── */}
        <section className="hero">
          <div className="hero-wash" aria-hidden="true">
            <span className="blob" data-float style={{ width: 520, height: 520, top: -160, left: -60, background: "radial-gradient(circle at 35% 35%, var(--peri), transparent 70%)" }} />
            <span className="blob" data-float style={{ width: 560, height: 560, top: -120, right: -120, background: "radial-gradient(circle at 60% 40%, var(--violet), transparent 68%)" }} />
            <span className="blob" data-float style={{ width: 460, height: 460, top: 40, left: "38%", background: "radial-gradient(circle at 50% 50%, var(--sky), transparent 70%)", opacity: 0.5 }} />
            <span className="blob" data-float style={{ width: 420, height: 420, top: 120, right: "22%", background: "radial-gradient(circle at 50% 50%, var(--mint), transparent 72%)", opacity: 0.45 }} />
            <span className="grain" />
          </div>
          <div className="wrap hero-in">
            <span className="hero-kicker" data-hero><span className="dot" aria-hidden="true" />{C.hero.kicker}</span>
            <h1>
              <span data-hero style={{ display: "block" }}>{C.hero.head1}</span>
              <span data-hero className="l2" style={{ display: "block" }}>{C.hero.head2}</span>
            </h1>
            <p className="hero-sub" data-hero>{C.hero.sub}</p>
            <div className="hero-cta" data-hero>
              <Link href={CTA.free.href} className="btn btn-primary">{CTA.free.label}<ArrowRight aria-hidden="true" /></Link>
              <a href={CTA.price.href} className="btn btn-ghost">{CTA.price.label}</a>
            </div>
            <p className="hero-note" data-hero><Spark />{C.hero.note}</p>
          </div>
        </section>

        {/* ── PROOF ROW ── */}
        <section className="wrap proof" aria-label="Показники банку питань">
          <p className="proof-lead" data-reveal>{C.proof.lead}</p>
          <div className="proof-grid" data-reveal-group>
            {C.proof.stats.map((s) => (
              <div className="proof-cell" key={s.label} data-reveal-item>
                <span className="proof-val num">{s.value}</span>
                <span className="proof-lbl">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── BENTO GRID #1 (light) ── */}
        <section id="features" className="wrap pad">
          <div className="sec-head" data-reveal>
            <h2>{C.features.h2}</h2>
            <p className="lead">{C.features.lead}</p>
          </div>

          <div className="bento1" data-reveal-group>
            {/* runner — big wide media */}
            <article className="cell b-runner" data-reveal-item>
              <div className="cell-pad">
                <span className="eyebrow">{C.features.runner.eyebrow}</span>
                <h3>{C.features.runner.claim}</h3>
                <p className="cbody">{C.features.runner.body}</p>
              </div>
              <div className="cell-shot">
                <img src={C.features.runner.img} alt={C.features.runner.alt} loading="lazy" decoding="async" />
              </div>
            </article>

            {/* side — anon-try text panel */}
            <article className="cell b-side" data-reveal-item>
              <div className="cell-pad">
                <span className="eyebrow">{C.features.side.eyebrow}</span>
                <h3 className="cbig">{C.features.side.claim}</h3>
                <p className="cbody">{C.features.side.body}</p>
                <div className="side-cta">
                  <Link href={CTA.anon.href} className="link-arrow">
                    {C.features.side.cta}<ArrowUpRight aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>

            {/* dial — wide short media strip */}
            <article className="cell b-dial" data-reveal-item>
              <div className="cell-pad">
                <span className="eyebrow">{C.features.dial.eyebrow}</span>
                <h3>{C.features.dial.claim}</h3>
              </div>
              <div className="cell-shot">
                <img src={C.features.dial.img} alt={C.features.dial.alt} loading="lazy" decoding="async" />
              </div>
            </article>

            {/* map — media */}
            <article className="cell b-map" data-reveal-item>
              <div className="cell-pad">
                <span className="eyebrow">{C.features.map.eyebrow}</span>
                <h3>{C.features.map.claim}</h3>
              </div>
              <div className="cell-shot">
                <img src={C.features.map.img} alt={C.features.map.alt} loading="lazy" decoding="async" />
              </div>
            </article>
          </div>
        </section>

        {/* ── DARK INSET BAND + BENTO #2 ── */}
        <section className="wrap band-wrap" aria-label="Шар аналітики">
          <div className="band" data-reveal>
            <span className="band-echo" data-float style={{ width: 480, height: 480, top: -180, right: -120, background: "radial-gradient(circle, var(--accent), transparent 68%)" }} aria-hidden="true" />
            <span className="band-echo" data-float style={{ width: 420, height: 420, bottom: -200, left: -80, background: "radial-gradient(circle, var(--sky), transparent 70%)", opacity: 0.32 }} aria-hidden="true" />
            <div className="band-in">
              <span className="kick">{C.intel.kicker}</span>
              <h2>{C.intel.h2}</h2>
              <p className="band-lead">{C.intel.lead}</p>

              <div className="bento2" data-reveal-group>
                {C.intel.cells.map((cell) => (
                  <article
                    key={cell.key}
                    className={`dcell d-${cell.key === "mistakes" ? "mist" : cell.key}`}
                    data-reveal-item
                  >
                    <div className="dcell-pad">
                      <span className="eyebrow">{cell.eyebrow}</span>
                      <h3>{cell.claim}</h3>
                      <p className="cbody">{cell.body}</p>
                    </div>
                    <div className="dcell-shot">
                      <img src={cell.img} alt={cell.alt} loading="lazy" decoding="async" />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CAROUSEL ── */}
        <section id="questions" className="pad">
          <div className="wrap">
            <div className="car-head">
              <div className="sec-head" style={{ marginBottom: 0 }} data-reveal>
                <h2>{C.questions.h2}</h2>
                <p className="lead">{C.questions.lead}</p>
              </div>
              <span className="car-hint" data-reveal>{C.questions.hint}</span>
            </div>
          </div>
          <div className="wrap">
            <div className="car-scroll" role="list" aria-label="Приклади офіційних питань">
              {C.questions.cards.map((card) => (
                <article className="qcard" role="listitem" key={card.key}>
                  <div className="qcard-img">
                    <img
                      src={`${IMG}/${card.key}.png`}
                      alt={`Ілюстрація до питання з розділу «${card.topic}»`}
                      loading="lazy" decoding="async"
                    />
                  </div>
                  <div className="qcard-body">
                    <span className="qcard-topic">{card.topic}</span>
                    <p className="qcard-q">{card.q}</p>
                  </div>
                </article>
              ))}
            </div>
            <p className="car-note">{C.questions.note}</p>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" className="wrap pad">
          <div className="sec-head" style={{ maxWidth: 700, margin: "0 auto 42px", textAlign: "center" }} data-reveal>
            <h2>{C.pricing.h2}</h2>
            <p className="lead" style={{ marginLeft: "auto", marginRight: "auto" }}>{C.pricing.lead}</p>
          </div>

          <div className="price-grid" data-reveal-group>
            {/* FREE */}
            <div className="pcard" data-reveal-item>
              <span className="pname">{C.pricing.free.name}</span>
              <div className="pprice">
                <span className="amt num">{C.pricing.free.price}</span>
                <span className="pnote">{C.pricing.free.note}</span>
              </div>
              <div className="pcta">
                <Link href={CTA.free.href} className="btn btn-primary">{C.pricing.free.cta}<ArrowRight aria-hidden="true" /></Link>
              </div>
              <ul className="plist">
                {C.pricing.free.items.map((it) => (
                  <li key={it}><span className="tick"><Check aria-hidden="true" /></span>{it}</li>
                ))}
              </ul>
            </div>

            {/* PAID — featured gradient ring */}
            <div className="pcard feat" data-reveal-item>
              <div className="feat-ring">
                <div className="feat-inner">
                  <span className="pbadge">{C.pricing.paid.badge}</span>
                  <span className="pname">{C.pricing.paid.name}</span>
                  <div className="pprice">
                    <span className="amt num">{C.pricing.paid.price}</span>
                    <span className="pnote">{C.pricing.paid.note}</span>
                  </div>
                  <div className="pcta">
                    <Link href={CTA.free.href} className="btn btn-primary">{C.pricing.paid.cta}<ArrowRight aria-hidden="true" /></Link>
                  </div>
                  <ul className="plist">
                    {C.pricing.paid.items.map((it) => (
                      <li key={it}><span className="tick"><Check aria-hidden="true" /></span>{it}</li>
                    ))}
                  </ul>
                  <p className="pfine">
                    <strong>{C.pricing.paid.negation}</strong><br />
                    {C.pricing.paid.honesty}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA CLOSE ── */}
        <section className="wrap close-wrap">
          <div className="close" data-reveal>
            <span className="close-echo" data-float style={{ width: 360, height: 360, top: -120, left: "18%", background: "radial-gradient(circle, var(--peri), transparent 68%)" }} aria-hidden="true" />
            <span className="close-echo" data-float style={{ width: 320, height: 320, top: -100, right: "16%", background: "radial-gradient(circle, var(--violet), transparent 70%)", opacity: 0.4 }} aria-hidden="true" />
            <div className="close-in">
              <h2>{C.close.h2}</h2>
              <p className="close-sub">{C.close.sub}</p>
              <div className="close-cta">
                <Link href={CTA.free.href} className="btn btn-primary">{CTA.free.label}<ArrowRight aria-hidden="true" /></Link>
                <Link href={CTA.anon.href} className="btn btn-ghost">{CTA.anon.label}<ArrowUpRight aria-hidden="true" /></Link>
              </div>
              <p className="close-note">{C.close.note}</p>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="wrap pad">
          <div className="sec-head" data-reveal><h2>{C.faq.h2}</h2></div>
          <div className="faq-grid" data-reveal-group>
            {C.faq.items.map((it) => (
              <div className="faq-item" key={it.q} data-reveal-item>
                <h3>{it.q}</h3>
                <p>{it.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="foot">
        <div className="wrap">
          <div className="foot-top">
            <div>
              <span className="brand"><span className="brand-mark" aria-hidden="true" />{C.brand}</span>
              <p className="foot-tag">{C.footer.tagline}</p>
            </div>
            <nav className="foot-links" aria-label="Підвал">
              <a href="#features">Можливості</a>
              <a href="#questions">Питання</a>
              <a href="#pricing">Ціна</a>
              <a href="#faq">FAQ</a>
              <Link href={CTA.login.href}>Увійти</Link>
              <Link href={CTA.free.href}>Створити акаунт</Link>
            </nav>
          </div>
          <div className="foot-legal">
            <p className="foot-disc">{C.footer.disclaimer}</p>
            <p className="foot-copy">{C.footer.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
