"use client";

/* ══════════════════════════════════════════════════════════════════════════
   v36 «Школа Pocket» — SHARED PAGE SHELL.

   The hero is a SWAPPABLE slot. The default page and the four hero-experiment
   routes (h1..h4) all render <V36Body hero={…}/> — same nav, same sections,
   same footer, same locked road identity — differing only in the top fold.

   Base STYLES + palette + shared craft primitives (Phone, Spark, BrandMark,
   Dots) + the interactive demo card + the whole non-hero body live here so
   every route stays pixel-consistent below the fold. Heroes own only their own
   composition + their own scoped <style> + their own reduced-motion-safe gsap.
   ══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Check,
  X,
  ArrowRight,
  ArrowUpRight,
  RotateCcw,
  Repeat,
  Wrench,
  Bookmark,
  Map as MapIcon,
  BookOpen,
  TrendingUp,
  Unlock,
  Gauge,
  Timer,
} from "lucide-react";
import { COPY, NAV, CTA } from "./copy";

const BENEFIT_ICONS = [Repeat, Wrench, Bookmark, MapIcon, BookOpen, TrendingUp];
// Feature glyphs, keyed to the card's own meaning (not a 01/02/03 order).
const FEATURE_ICONS: Record<string, typeof Unlock> = { anon: Unlock, dial: Gauge, exam: Timer };

const STYLES = `
.v36{
  --bg:#F2F6FC; --bg2:#E4EDFB; --bg3:#0E1E3E; --surface:#FFFFFF;
  --ink:#14223D; --ink-soft:#2C3A57; --muted:#4F5C77;
  --line:#DCE6F5; --line-soft:#EAF1FB;
  /* road-sign informational BLUE — the brand */
  --blue:#1E5BD6; --blue-600:#1848AB; --blue-700:#12357D;
  --blue-tint:#E7EFFD; --blue-ink:#143A86;
  /* road-marking YELLOW — the accent */
  --yellow:#F5B301; --yellow-600:#D99700; --yellow-tint:#FCEFC8; --yellow-ink:#6E4E00;
  /* traffic-light GREEN — «правильно» / success */
  --green:#12996B; --green-600:#0E7A54; --green-tint:#DBF3E8; --green-ink:#0E6B4B;
  --red:#E5484D;
  --ok:#12996B; --no:#D64562;
  --r:22px; --r-sm:14px; --r-lg:30px; --r-xl:40px;
  --z-blob:0; --z-content:2; --z-nav:60; --z-skip:80;
  background:var(--bg); color:var(--ink);
  font-family:var(--font-body),system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
  line-height:1.62; letter-spacing:-0.003em; overflow-x:clip;
}
.v36 *{box-sizing:border-box;}
.v36 ::selection{background:rgba(30,91,214,.20);}
.v36 h1,.v36 h2,.v36 h3,.v36 .disp{
  font-family:var(--font-display),system-ui,sans-serif;
  font-weight:800; letter-spacing:-0.028em; line-height:1.05;
  text-wrap:balance; color:var(--ink); margin:0;
}
/* sub-tier headings (card + FAQ titles) wrap at 1.1–1.4rem — 1.05 is too tight */
.v36 h3{line-height:1.22;letter-spacing:-0.022em;}
.v36 p{margin:0;} .v36 a{color:inherit;text-decoration:none;}
.v36 .num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1;}
.v36 .sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}
.v36 .skip{position:fixed;top:12px;left:12px;z-index:var(--z-skip);background:var(--ink);color:#fff;font-weight:700;
  padding:10px 16px;border-radius:12px;transform:translateY(-200%);transition:transform .18s;}
.v36 .skip:focus{transform:translateY(0);}
.v36 :focus-visible{outline:3px solid var(--blue);outline-offset:3px;border-radius:8px;}

/* shell */
.v36 .wrap{max-width:1200px;margin:0 auto;padding:0 24px;}
.v36 .sec{padding:clamp(64px,9vw,108px) 0;position:relative;}
.v36 .sec-head{max-width:720px;margin:0 auto clamp(40px,6vw,60px);text-align:center;}
.v36 .sec-head h2{font-size:clamp(1.85rem,4.4vw,3.05rem);}
.v36 .sec-head p{margin-top:16px;color:var(--muted);font-size:clamp(1.02rem,1.4vw,1.16rem);line-height:1.6;}

/* buttons */
.v36 .btn{display:inline-flex;align-items:center;gap:9px;font-family:var(--font-display);font-weight:700;
  font-size:1rem;border-radius:999px;padding:13px 24px;cursor:pointer;border:2px solid transparent;
  transition:transform .16s cubic-bezier(.2,.8,.3,1),box-shadow .2s,background .2s,color .2s;white-space:nowrap;line-height:1;}
.v36 .btn-primary{background:var(--blue);color:#fff;box-shadow:0 12px 26px -12px rgba(30,91,214,.85),0 2px 0 0 var(--blue-700);}
.v36 .btn-primary:hover{background:var(--blue-600);transform:translateY(-2px);box-shadow:0 18px 34px -12px rgba(30,91,214,.9),0 2px 0 0 var(--blue-700);}
.v36 .btn-ghost{background:var(--surface);color:var(--ink);border-color:var(--line);box-shadow:0 6px 18px -14px rgba(20,34,63,.5);}
.v36 .btn-ghost:hover{border-color:#C4D6F3;transform:translateY(-2px);box-shadow:0 12px 26px -16px rgba(20,34,63,.55);}
.v36 .btn-onink{background:#fff;color:var(--ink);}
.v36 .btn-onink:hover{transform:translateY(-2px);background:#fff;box-shadow:0 16px 32px -14px rgba(0,0,0,.5);}
/* press state AFTER hover so equal-specificity :active wins while the pointer is down */
.v36 .btn-primary:active,.v36 .btn-ghost:active,.v36 .btn-onink:active{transform:translateY(1px) scale(.99);}
.v36 .btn-lg{padding:16px 30px;font-size:1.08rem;}
.v36 .btn-sm{padding:10px 18px;font-size:.94rem;}
.v36 .btn svg{width:18px;height:18px;}
.v36 .link-arrow{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-display);font-weight:700;color:var(--blue-700);}
.v36 .link-arrow svg{width:16px;height:16px;transition:transform .18s;}
.v36 .link-arrow:hover svg{transform:translate(3px,-3px);}

/* chip / pill */
.v36 .chip{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-display);font-weight:700;
  font-size:.86rem;padding:8px 15px;border-radius:999px;background:var(--surface);color:var(--blue-ink);
  border:2px solid var(--line);box-shadow:0 6px 16px -12px rgba(20,34,63,.5);}
.v36 .chip .dot{width:8px;height:8px;border-radius:50%;background:var(--green);box-shadow:0 0 0 4px var(--green-tint);}

/* ── NAV ──────────────────────────────────────────────────────────────────── */
.v36 .nav{position:sticky;top:0;z-index:var(--z-nav);background:rgba(242,246,252,.78);
  backdrop-filter:saturate(160%) blur(14px);-webkit-backdrop-filter:saturate(160%) blur(14px);
  border-bottom:2px solid transparent;transition:border-color .25s,box-shadow .25s;}
.v36 .nav.scrolled{border-color:var(--line);box-shadow:0 10px 30px -22px rgba(20,34,63,.6);}
.v36 .nav-in{display:flex;align-items:center;gap:20px;height:72px;}
.v36 .brand{display:flex;align-items:center;gap:10px;font-family:var(--font-display);font-weight:800;
  font-size:1.16rem;letter-spacing:-0.03em;white-space:nowrap;color:var(--ink);}
.v36 .brand-mark{width:36px;height:36px;flex:none;}
.v36 .nav-links{display:flex;gap:4px;margin-left:14px;}
.v36 .nav-links a{padding:9px 13px;border-radius:12px;font-weight:600;font-size:.97rem;color:var(--ink-soft);transition:background .18s,color .18s;}
.v36 .nav-links a:hover{background:var(--blue-tint);color:var(--blue-ink);}
.v36 .nav-right{margin-left:auto;display:flex;align-items:center;gap:10px;}
.v36 .nav-login{font-family:var(--font-display);font-weight:700;padding:9px 14px;border-radius:12px;color:var(--ink-soft);transition:background .18s;}
.v36 .nav-login:hover{background:var(--blue-tint);}
/* compact anchor rail — only when the inline nav-links collapse (≤980) */
.v36 .nav-rail{display:none;}
.v36 .nav-rail-in{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:8px 18px 10px;
  -webkit-overflow-scrolling:touch;
  /* edge fade: a clipped pill at the right viewport edge reads as CUT without an
     affordance that the rail scrolls — the mask makes the cut read as a fade-out */
  mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 32px),transparent);
  -webkit-mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 32px),transparent);}
.v36 .nav-rail-in::-webkit-scrollbar{display:none;}
.v36 .nav-rail a{flex:none;font-family:var(--font-display);font-weight:700;font-size:.86rem;
  padding:7px 14px;border-radius:999px;background:var(--surface);border:2px solid var(--line);
  color:var(--blue-ink);white-space:nowrap;}
.v36 .nav-rail a:active{background:var(--blue-tint);}
/* nav variant: legible over the dark «Проспект» hero ground */
.v36 .nav.on-dark{background:rgba(14,30,62,.72);backdrop-filter:saturate(150%) blur(14px);-webkit-backdrop-filter:saturate(150%) blur(14px);}
.v36 .nav.on-dark:not(.scrolled) .brand{color:#fff;}
.v36 .nav.on-dark:not(.scrolled) .nav-links a{color:#C9D8F2;}
.v36 .nav.on-dark:not(.scrolled) .nav-links a:hover{background:rgba(255,255,255,.10);color:#fff;}
.v36 .nav.on-dark:not(.scrolled) .nav-login{color:#DCE6F8;}
.v36 .nav.on-dark:not(.scrolled) .nav-login:hover{background:rgba(255,255,255,.10);}
.v36 .nav.on-dark.scrolled{background:rgba(242,246,252,.86);}

/* ── decorative craft ─────────────────────────────────────────────────────── */
.v36 .blob{position:absolute;border-radius:50%;filter:blur(52px);opacity:.55;pointer-events:none;z-index:var(--z-blob);}
.v36 .dots{position:absolute;pointer-events:none;z-index:var(--z-blob);opacity:.6;color:var(--blue);}
.v36 .squig{position:absolute;pointer-events:none;z-index:var(--z-blob);overflow:visible;}
.v36 .spark{position:absolute;pointer-events:none;z-index:3;color:var(--yellow);}

/* ── PHONE FRAME (own craft) ──────────────────────────────────────────────── */
.v36 .phone{position:relative;width:100%;max-width:280px;aspect-ratio:390/844;
  background:linear-gradient(160deg,#173257,#0E1E3E);border-radius:44px;padding:11px;
  box-shadow:0 2px 0 1px rgba(255,255,255,.10) inset,0 40px 70px -30px rgba(14,30,62,.75),0 14px 30px -18px rgba(14,30,62,.6);}
.v36 .phone::before{content:"";position:absolute;top:16px;left:50%;transform:translateX(-50%);
  width:96px;height:9px;border-radius:999px;background:rgba(255,255,255,.16);z-index:4;}
.v36 .phone::after{content:"";position:absolute;right:-3px;top:150px;width:3px;height:74px;border-radius:3px;
  background:linear-gradient(#274063,#14223D);}
.v36 .phone-screen{position:relative;width:100%;height:100%;border-radius:34px;overflow:hidden;background:#fff;}
.v36 .phone-screen img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center;}
.v36 .phone-glow{position:absolute;inset:-8px;border-radius:52px;z-index:-1;
  background:radial-gradient(60% 55% at 50% 30%,rgba(30,91,214,.32),transparent 70%);filter:blur(10px);}

/* ── HERO (default «Школа Pocket») ────────────────────────────────────────── */
.v36 .hero{position:relative;overflow:hidden;padding:clamp(40px,6vw,68px) 0 clamp(48px,7vw,84px);}
.v36 .hero-grid{position:relative;z-index:var(--z-content);display:grid;grid-template-columns:1.05fr .95fr;
  gap:clamp(28px,4vw,56px);align-items:center;}
.v36 .kicker{display:inline-flex;align-items:center;gap:9px;font-family:var(--font-display);font-weight:700;
  font-size:.86rem;color:var(--blue-ink);background:var(--blue-tint);border:2px solid #CFE0FB;
  padding:8px 15px;border-radius:999px;margin-bottom:22px;}
.v36 .kicker .dot{width:8px;height:8px;border-radius:50%;background:var(--blue);}
.v36 h1{font-size:clamp(2.35rem,6vw,4.1rem);line-height:1.02;letter-spacing:-0.035em;}
.v36 .mark{position:relative;white-space:nowrap;color:var(--blue-700);z-index:1;}
.v36 .mark .mk{position:absolute;left:-5%;right:-5%;bottom:.02em;height:.46em;background:var(--yellow);
  border-radius:999px 999px 999px 500px;opacity:.42;z-index:-1;transform:rotate(-1.4deg);}
.v36 .hero-sub{font-size:clamp(1.06rem,1.55vw,1.24rem);color:var(--ink-soft);max-width:36ch;
  margin:26px 0 0;line-height:1.6;}
.v36 .hero-cta{display:flex;gap:14px;flex-wrap:wrap;margin-top:32px;}
.v36 .hero-note{margin-top:18px;font-size:.94rem;color:var(--muted);display:flex;align-items:center;gap:8px;}
.v36 .hero-note svg{width:16px;height:16px;color:var(--green-600);flex:none;}
.v36 .hero-phone-wrap{position:relative;display:flex;justify-content:center;align-items:center;min-height:400px;}
.v36 .hero-phone{transform:rotate(-4deg);}

/* ── PROOF BAND — one unified typographic statement (not a stat dashboard) ──── */
.v36 .proof{position:relative;z-index:var(--z-content);}
.v36 .proof-card{max-width:880px;margin:0 auto;background:var(--surface);border:2px solid var(--line);
  border-radius:var(--r-lg);padding:clamp(28px,3.6vw,46px) clamp(24px,3.6vw,52px);
  box-shadow:0 40px 70px -50px rgba(20,34,63,.5);text-align:center;}
.v36 .proof-top{display:flex;justify-content:center;margin-bottom:clamp(18px,2.4vw,26px);}
/* the single honest sentence — figures ride inline as emphasized numerals */
.v36 .proof-say{font-family:var(--font-display);font-weight:700;letter-spacing:-.02em;
  font-size:clamp(1.42rem,3.1vw,2.3rem);line-height:1.34;color:var(--ink);
  max-width:24ch;margin:0 auto;text-wrap:balance;}
.v36 .proof-num{font-weight:800;letter-spacing:-.03em;color:var(--blue-700);white-space:nowrap;}

/* ── FEATURE CARDS ────────────────────────────────────────────────────────── */
.v36 .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;}
.v36 .feat{position:relative;border-radius:var(--r-lg);border:2px solid var(--line);overflow:hidden;
  padding:30px 26px 34px;display:flex;flex-direction:column;transition:transform .25s cubic-bezier(.2,.8,.3,1),box-shadow .25s;}
.v36 .feat:hover{transform:translateY(-6px);box-shadow:0 30px 54px -34px rgba(20,34,63,.55);}
.v36 .feat.blue{background:linear-gradient(180deg,var(--blue-tint),#F7FAFF);}
.v36 .feat.yellow{background:linear-gradient(180deg,var(--yellow-tint),#FFFDF4);}
.v36 .feat.green{background:linear-gradient(180deg,var(--green-tint),#F5FCF9);}
/* tone-matched glyph chip — the three features are parallel, not a 01/02/03 sequence */
.v36 .feat-ico{align-self:flex-start;width:48px;height:48px;border-radius:15px;display:grid;place-items:center;margin-bottom:18px;}
.v36 .feat-ico svg{width:24px;height:24px;}
.v36 .feat.blue .feat-ico{background:var(--blue);color:#fff;}
.v36 .feat.yellow .feat-ico{background:var(--yellow);color:#3A2400;}
.v36 .feat.green .feat-ico{background:var(--green);color:#fff;}
.v36 .feat h3{font-size:1.4rem;letter-spacing:-.02em;}
.v36 .feat p{margin-top:12px;color:var(--ink-soft);font-size:1rem;line-height:1.58;}
.v36 .feat-link{margin-top:16px;}
.v36 .feat-phone-wrap{margin-top:auto;padding-top:26px;display:flex;justify-content:center;position:relative;}
.v36 .feat .phone{max-width:214px;}
.v36 .feat.blue .feat-link{color:var(--blue-700);}
.v36 .feat.yellow .feat-link{color:var(--yellow-ink);}
.v36 .feat.green .feat-link{color:var(--green-ink);}

/* ── BENEFITS — ONE unified checklist panel (not six clones) ─────────────────
   A single white .proof-card-language panel; six items read as ruled rows in a
   2×3 grid (desktop), a single-column list on mobile. Hairline rules (var(
   --line-soft)) form the grid instead of six separate bordered boxes. */
.v36 .ben-panel{max-width:960px;margin:0 auto;background:var(--surface);border:2px solid var(--line);
  border-radius:var(--r-lg);box-shadow:0 40px 70px -50px rgba(20,34,63,.5);overflow:hidden;
  padding:clamp(6px,1vw,12px);}
.v36 .ben-grid{display:grid;grid-template-columns:1fr 1fr;}
.v36 .ben{display:flex;gap:15px;align-items:flex-start;padding:22px clamp(16px,2vw,26px);
  border-top:2px solid var(--line-soft);border-left:2px solid var(--line-soft);
  border-radius:var(--r-sm);transition:background .2s;}
/* the hairlines: first row has no top rule, the left column has no left rule —
   so the remaining rules read as a clean 2×3 cross-grid inside the one panel */
.v36 .ben:nth-child(1),.v36 .ben:nth-child(2){border-top:none;}
.v36 .ben:nth-child(odd){border-left:none;}
.v36 .ben:hover{background:var(--line-soft);}
.v36 .ben-ico{width:44px;height:44px;flex:none;border-radius:13px;display:grid;place-items:center;
  background:var(--blue-tint);color:var(--blue-700);}
/* rotate the glyph disc through the three-tone system so this block re-joins the palette */
.v36 .ben:nth-child(3n+2) .ben-ico{background:var(--yellow-tint);color:var(--yellow-ink);}
.v36 .ben:nth-child(3n) .ben-ico{background:var(--green-tint);color:var(--green-ink);}
.v36 .ben-ico svg{width:22px;height:22px;}
.v36 .ben-txt{min-width:0;}
.v36 .ben h3{font-size:1.1rem;letter-spacing:-.02em;}
.v36 .ben p{margin-top:5px;color:var(--muted);font-size:.95rem;line-height:1.5;}

/* ── CLOSING CTA BAND — the hero's blue world returns to close the page ──────
   full-bleed saturated sign-blue ramp; one unified centred block; the primary
   is the hero's solid marking-yellow treatment, the secondary a quiet white
   outline. A marking-yellow lane-dash runs the lower edge (echoing the hero's
   CTA), static under reduced-motion. */
.v36 .finalcta{position:relative;overflow:hidden;color:#fff;
  background:linear-gradient(165deg,var(--blue) 0%,var(--blue-700) 100%);
  box-shadow:inset 0 40px 90px -60px rgba(4,11,32,.6);}
/* lower-edge lane-dash — road-native, quiet, purely decorative (no motion) */
.v36 .finalcta::after{content:"";position:absolute;left:0;right:0;bottom:0;height:6px;pointer-events:none;
  background:repeating-linear-gradient(90deg,var(--yellow) 0 26px,transparent 26px 50px);opacity:.55;}
.v36 .finalcta-inner{position:relative;z-index:2;max-width:720px;margin:0 auto;text-align:center;}
.v36 .finalcta-inner h2{color:#fff;font-size:clamp(1.9rem,4.6vw,3.1rem);}
.v36 .finalcta-inner p{margin:16px auto 0;max-width:46ch;color:#DCE6F8;
  font-size:clamp(1.05rem,1.5vw,1.2rem);line-height:1.6;}
.v36 .finalcta-cta{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-top:32px;}
/* shared marking-yellow button treatment (mirrors the hero's .btn-yellow) */
.v36 .finalcta .btn-yellow{background:var(--yellow);color:#3A2400;border-color:transparent;
  box-shadow:0 14px 30px -12px rgba(245,179,1,.6),0 2px 0 0 var(--yellow-600);}
.v36 .finalcta .btn-yellow:hover{background:#FFC22B;transform:translateY(-2px);
  box-shadow:0 20px 38px -12px rgba(245,179,1,.7),0 2px 0 0 var(--yellow-600);}
.v36 .finalcta .btn-yellow svg{transition:transform .2s cubic-bezier(.2,.8,.3,1);}
.v36 .finalcta .btn-yellow:hover svg{transform:translateX(3px);}
.v36 .finalcta .btn-onblue{background:rgba(255,255,255,.06);color:#fff;border-color:rgba(255,255,255,.5);}
.v36 .finalcta .btn-onblue:hover{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.85);transform:translateY(-2px);}
/* focus ring: the global blue outline vanishes on the blue field → re-scope to white */
.v36 .finalcta a:focus-visible{outline:3px solid #fff;outline-offset:3px;box-shadow:0 0 0 7px rgba(9,26,74,.4);}

/* ── REAL-CONTENT MOMENT (mini-demo) ──────────────────────────────────────── */
.v36 .demo{position:relative;overflow:hidden;}
.v36 .demo-card{position:relative;z-index:var(--z-content);max-width:940px;margin:0 auto;
  background:var(--surface);border:2px solid var(--line);border-radius:var(--r-xl);
  box-shadow:0 50px 90px -55px rgba(20,34,63,.6);overflow:hidden;
  display:grid;grid-template-columns:1fr 1fr;}
.v36 .demo-media{position:relative;background:linear-gradient(160deg,var(--blue-tint),var(--green-tint));
  padding:26px;display:flex;flex-direction:column;justify-content:center;gap:16px;}
.v36 .demo-topic{margin-bottom:auto;display:inline-flex;align-self:flex-start;font-family:var(--font-display);font-weight:700;
  font-size:.82rem;padding:6px 13px;border-radius:999px;background:#fff;color:var(--blue-ink);border:2px solid var(--line);}
.v36 .demo-imgframe{border-radius:18px;overflow:hidden;border:3px solid #fff;box-shadow:0 20px 40px -26px rgba(20,34,63,.6);background:#fff;}
.v36 .demo-imgframe img{display:block;width:100%;height:auto;}
.v36 .demo-cap{font-size:.82rem;color:var(--muted);line-height:1.45;}
.v36 .demo-body{padding:clamp(24px,3vw,34px);display:flex;flex-direction:column;}
.v36 .demo-q{font-family:var(--font-display);font-weight:700;font-size:1.24rem;line-height:1.32;letter-spacing:-.02em;color:var(--ink);}
.v36 .demo-opts{margin-top:18px;display:flex;flex-direction:column;gap:11px;}
.v36 .opt{text-align:left;font:inherit;font-size:.98rem;color:var(--ink);background:#fff;border:2px solid var(--line);
  border-radius:14px;padding:13px 15px;cursor:pointer;transition:border-color .18s,background .18s,transform .12s;display:flex;gap:11px;align-items:flex-start;line-height:1.4;}
.v36 .opt:hover{border-color:#C4D6F3;transform:translateY(-1px);}
.v36 .opt .tick{width:22px;height:22px;border-radius:50%;border:2px solid var(--line);flex:none;margin-top:1px;display:grid;place-items:center;transition:.18s;}
.v36 .opt .tick svg{grid-area:1/1;width:13px;height:13px;opacity:0;transition:.18s;color:#fff;}
.v36 .opt.correct{border-color:var(--ok);background:var(--green-tint);}
.v36 .opt.correct .tick{background:var(--ok);border-color:var(--ok);}
.v36 .opt.correct .tick .i-ok{opacity:1;}
.v36 .opt.wrong{border-color:var(--no);background:#FDEBEF;}
.v36 .opt.wrong .tick{background:var(--no);border-color:var(--no);}
.v36 .opt.wrong .tick .i-no{opacity:1;}
.v36 .opt:disabled{cursor:default;}
.v36 .demo-prompt{margin-top:14px;font-size:.9rem;color:var(--muted);}
.v36 .demo-status{min-height:44px;}
.v36 .demo-reveal{margin-top:16px;border-radius:16px;padding:16px 18px;border:2px solid;font-size:.97rem;line-height:1.55;
  animation:v36reveal .22s cubic-bezier(.2,.8,.3,1) both;}
@keyframes v36reveal{from{opacity:0;transform:translateY(4px);}to{opacity:1;transform:none;}}
@media (prefers-reduced-motion:reduce){.v36 .demo-reveal{animation:v36revealrm .18s ease both;}
  @keyframes v36revealrm{from{opacity:0;}to{opacity:1;}}}
.v36 .demo-reveal.r-ok{background:var(--green-tint);border-color:#B7E6D4;color:var(--green-ink);}
.v36 .demo-reveal.r-no{background:#FDEBEF;border-color:#F6C3D0;color:#9F2540;}
.v36 .demo-reveal b{font-family:var(--font-display);}
.v36 .demo-reveal-text{margin:0;}
.v36 .demo-pdr{display:inline-flex;align-items:center;gap:6px;margin-top:12px;font-family:var(--font-display);
  font-weight:700;font-size:.78rem;padding:5px 11px;border-radius:999px;background:rgba(255,255,255,.72);letter-spacing:.01em;}
.v36 .demo-pdr svg{width:14px;height:14px;}
.v36 .demo-foot{margin-top:auto;padding-top:18px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;}
.v36 .demo-ref{font-size:.8rem;color:var(--muted);max-width:34ch;line-height:1.4;}
.v36 .demo-reset{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-display);font-weight:700;
  font-size:.9rem;color:var(--blue-700);cursor:pointer;background:none;border:none;padding:6px 0;}
.v36 .demo-reset svg{width:15px;height:15px;}

/* ── PRICING ──────────────────────────────────────────────────────────────── */
.v36 .price-grid{display:grid;grid-template-columns:1.06fr .94fr;gap:22px;max-width:920px;margin:0 auto;align-items:stretch;}
.v36 .plan{position:relative;border-radius:var(--r-lg);padding:clamp(28px,3.4vw,40px);display:flex;flex-direction:column;}
.v36 .plan-free{background:linear-gradient(165deg,#fff,#F7FAFF);border:2px solid var(--line);box-shadow:0 40px 70px -48px rgba(20,34,63,.5);}
.v36 .plan-paid{background:linear-gradient(165deg,var(--bg3),#173257);border:2px solid #274063;color:#DCE6F8;}
.v36 .plan-name{font-family:var(--font-display);font-weight:800;font-size:1.02rem;}
.v36 .plan-free .plan-name{color:var(--blue-700);}
.v36 .plan-paid .plan-name{color:#A9C6F7;}
.v36 .plan-price{display:flex;align-items:baseline;gap:10px;margin-top:12px;flex-wrap:wrap;}
.v36 .plan-price .p{font-family:var(--font-display);font-weight:800;font-size:clamp(2.6rem,5vw,3.4rem);letter-spacing:-.04em;line-height:1;white-space:nowrap;}
.v36 .plan-free .plan-price .p{color:var(--ink);}
.v36 .plan-paid .plan-price .p{color:#fff;}
.v36 .plan-note{font-size:.92rem;color:var(--muted);margin-top:6px;}
.v36 .plan-paid .plan-note{color:#A6B6D8;}
.v36 .plan-badge{position:absolute;top:-13px;right:24px;font-family:var(--font-display);font-weight:800;font-size:.78rem;
  padding:7px 14px;border-radius:999px;background:var(--yellow);color:#3A2400;box-shadow:0 10px 22px -12px rgba(245,179,1,.9);}
.v36 .plan-list{list-style:none;padding:0;margin:24px 0 0;display:flex;flex-direction:column;gap:12px;flex:1;}
.v36 .plan-list li{display:flex;gap:11px;align-items:flex-start;font-size:.99rem;line-height:1.45;}
.v36 .plan-list .ci{width:22px;height:22px;border-radius:50%;flex:none;display:grid;place-items:center;margin-top:1px;}
.v36 .plan-list .ci svg{width:13px;height:13px;}
.v36 .plan-free .plan-list .ci{background:var(--green-tint);color:var(--green-600);}
.v36 .plan-paid .plan-list .ci{background:rgba(169,198,247,.18);color:#A9C6F7;}
.v36 .plan-cta{margin-top:26px;justify-content:center;}
.v36 .plan-honest{margin-top:16px;font-size:.86rem;line-height:1.45;color:#A6B6D8;}

/* ── FAQ ──────────────────────────────────────────────────────────────────── */
.v36 .faq-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 22px;max-width:980px;margin:0 auto;}
.v36 .faq-item{background:var(--surface);border:2px solid var(--line);border-radius:var(--r);padding:24px 24px 26px;}
.v36 .faq-item h3{font-size:1.1rem;letter-spacing:-.02em;display:flex;gap:10px;align-items:flex-start;}
.v36 .faq-item h3 .qm{font-family:var(--font-display);font-weight:800;color:var(--blue);flex:none;}
.v36 .faq-item p{margin-top:9px;color:var(--muted);font-size:.97rem;line-height:1.6;}

/* ── FOOTER ───────────────────────────────────────────────────────────────── */
.v36 .foot{background:var(--bg3);color:#C3CFE6;padding:clamp(48px,6vw,72px) 0 34px;position:relative;overflow:hidden;}
.v36 .foot-grid{position:relative;z-index:var(--z-content);display:grid;grid-template-columns:1.5fr 1fr 1fr auto;gap:34px;align-items:start;}
.v36 .foot-brand{display:flex;align-items:center;gap:10px;font-family:var(--font-display);font-weight:800;font-size:1.18rem;color:#fff;}
.v36 .foot-tag{margin-top:14px;font-size:.96rem;line-height:1.55;color:#A6B6D8;max-width:34ch;}
.v36 .foot-col h4{font-family:var(--font-display);font-weight:800;font-size:.82rem;letter-spacing:.06em;
  text-transform:uppercase;color:#8E9CBE;margin:0 0 14px;}
.v36 .foot-col a{display:block;padding:6px 0;font-size:.97rem;color:#C3CFE6;transition:color .16s;}
.v36 .foot-col a:hover{color:#fff;}
.v36 .foot-qr{text-align:center;}
.v36 .foot-qr-frame{width:126px;height:126px;border-radius:20px;background:#fff;padding:12px;margin:0 auto;box-shadow:0 20px 40px -22px rgba(0,0,0,.6);}
.v36 .foot-qr-frame img{width:100%;height:100%;display:block;}
.v36 .foot-qr-lab{margin-top:12px;font-family:var(--font-display);font-weight:700;font-size:.9rem;color:#fff;}
.v36 .foot-qr-note{margin-top:3px;font-size:.78rem;color:#8E9CBE;max-width:18ch;margin-left:auto;margin-right:auto;line-height:1.4;}
.v36 .foot-legal{position:relative;z-index:var(--z-content);margin-top:40px;padding-top:26px;border-top:2px solid rgba(169,198,247,.14);
  display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;align-items:flex-start;}
.v36 .foot-disc{font-size:.82rem;color:#8E9CBE;line-height:1.55;max-width:70ch;}
.v36 .foot-cr{font-size:.85rem;color:#A6B6D8;white-space:nowrap;font-family:var(--font-display);font-weight:600;}

/* anchored jumps clear the 72px sticky nav instead of hiding under it */
.v36 section[id]{scroll-margin-top:88px;}
.v36 #main{scroll-margin-top:0;}
@media (prefers-reduced-motion:no-preference){html:has(.v36){scroll-behavior:smooth;}}

/* ── responsive ───────────────────────────────────────────────────────────── */
/* collapse the inline nav early — nowrap CTA + fixed gaps overflow the tablet band */
@media (max-width:980px){
  .v36 .nav-links{display:none;}
  .v36 .nav-rail{display:block;}
}
@media (max-width:960px){
  .v36 .hero-grid{grid-template-columns:1fr;text-align:center;}
  .v36 .hero-sub{margin-left:auto;margin-right:auto;}
  .v36 .hero-cta,.v36 .hero-note{justify-content:center;}
  /* copy leads on mobile; the phone follows and peeks up from below the CTA */
  .v36 .hero-phone-wrap{order:0;min-height:0;margin-top:14px;}
  .v36 .hero-phone{transform:rotate(-3deg);}
  .v36 .feat-grid{grid-template-columns:1fr;max-width:420px;margin:0 auto;}
  .v36 .feat-phone-wrap{margin-top:22px;}
  .v36 .ben-grid{grid-template-columns:1fr 1fr;}
  .v36 .demo-card{grid-template-columns:1fr;}
  .v36 .price-grid{grid-template-columns:1fr;max-width:460px;}
  .v36 .faq-grid{grid-template-columns:1fr;max-width:620px;}
  .v36 .foot-grid{grid-template-columns:1fr 1fr;}
  .v36 .foot-qr{grid-column:1 / -1;text-align:left;}
  .v36 .foot-qr-frame,.v36 .foot-qr-note{margin-left:0;}
}
@media (max-width:620px){
  .v36 .wrap{padding:0 18px;}
  .v36 .nav-in{gap:12px;}
  .v36 .nav-login{display:none;}
  .v36 .brand{font-size:1.05rem;min-width:0;overflow:hidden;}
  .v36 .brand-text{overflow:hidden;text-overflow:ellipsis;}
  .v36 .brand-mark{width:32px;height:32px;}
  .v36 h1{font-size:clamp(2.1rem,8.5vw,2.6rem);}
  /* crop the feature phones to a top slice so the mobile scroll isn't 3 full bezels */
  .v36 .feat .phone{max-width:190px;}
  /* benefits collapse to one column: rule between every row, none on the left */
  .v36 .ben-grid{grid-template-columns:1fr;}
  .v36 .ben{border-left:none;border-top:2px solid var(--line-soft);}
  .v36 .ben:first-child{border-top:none;}
  /* closing CTA: full-width stacked buttons so they never crowd at 390 */
  .v36 .finalcta-cta{flex-direction:column;}
  .v36 .finalcta-cta .btn{width:100%;justify-content:center;}
  .v36 .foot-grid{grid-template-columns:1fr;}
}
@media (max-width:430px){
  /* mark-only brand: the aria-label on .brand keeps the name for AT */
  .v36 .brand-text{display:none;}
}
@media (prefers-reduced-motion:reduce){
  .v36 *{scroll-behavior:auto;}
}

/* ══ DELIGHT — four quiet, road-native signatures (invisible in a thumbnail) ══ */

/* 1 · the primary CTA "pulls away": the arrow accelerates and a road-marking
   lane-dash sweeps the lower edge — a car pulling onto the road. Hover only;
   the dashes hold still under reduced-motion. */
.v36 .btn-primary svg{transition:transform .2s cubic-bezier(.2,.8,.3,1);}
.v36 .btn-primary:hover svg{transform:translateX(3px);}
.v36 .btn-primary.btn-lg{position:relative;overflow:hidden;}
.v36 .btn-primary.btn-lg::after{content:"";position:absolute;left:16px;right:16px;bottom:6px;height:2px;
  border-radius:2px;pointer-events:none;opacity:0;transform:translateY(3px);transition:opacity .22s,transform .22s;
  background:repeating-linear-gradient(90deg,rgba(245,179,1,.9) 0 10px,transparent 10px 19px);}
.v36 .btn-primary.btn-lg:hover::after{opacity:.7;transform:none;animation:v36lane .5s linear infinite;}
@keyframes v36lane{from{background-position-x:0;}to{background-position-x:19px;}}

/* 2 · hover a feature card and light travels across the phone's glass — the
   "product in your pocket" motif catching the sun. Clipped to the screen. */
.v36 .feat .phone-screen::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:5;
  background:linear-gradient(114deg,transparent 40%,rgba(255,255,255,.4) 50%,transparent 60%);
  transform:translateX(-125%);transition:transform .72s cubic-bezier(.2,.8,.3,1);}
.v36 .feat:hover .phone-screen::after{transform:translateX(125%);}

/* 3 · the "правильно" moment — the correct answer's tick gives a satisfying
   pop, the tiny reward at the exact spot a learner earns it. */
.v36 .opt.correct .tick{animation:v36pop .42s cubic-bezier(.2,.9,.3,1) both;}
@keyframes v36pop{0%{transform:scale(.72);}52%{transform:scale(1.14);}100%{transform:scale(1);}}

/* 4 · the footer is asphalt (a barely-there speckle), and hovering the wordmark
   turns its traffic light green — a hidden "go" for the curious. */
.v36 .foot{background-image:radial-gradient(rgba(255,255,255,.045) 1px,transparent 1.4px);background-size:7px 7px;}
.v36 .foot-brand .brand-mark .tl-r,
.v36 .foot-brand .brand-mark .tl-y,
.v36 .foot-brand .brand-mark .tl-g{transition:opacity .32s ease,filter .32s ease;}
.v36 .foot-brand:hover .brand-mark .tl-r,
.v36 .foot-brand:hover .brand-mark .tl-y{opacity:.32;}
.v36 .foot-brand:hover .brand-mark .tl-g{filter:drop-shadow(0 0 4px var(--green)) drop-shadow(0 0 2px var(--green));}

@media (prefers-reduced-motion:reduce){
  .v36 .btn-primary:hover svg{transform:none;}
  .v36 .btn-primary.btn-lg:hover::after{animation:none;opacity:.55;transform:none;}
  .v36 .feat .phone-screen::after{display:none;}
  .v36 .opt.correct .tick{animation:none;}
}
`;

export type Tone = "blue" | "yellow" | "green";

/* ── shared craft primitives (heroes import these) ─────────────────────────── */

export function Phone({
  src,
  alt,
  className,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`phone ${className ?? ""}`}>
      <span className="phone-glow" aria-hidden />
      <div className="phone-screen">
        <Image src={src} alt={alt} width={390} height={844} sizes="280px" priority={priority} />
      </div>
    </div>
  );
}

export function Spark({ style, size = 26 }: { style?: React.CSSProperties; size?: number }) {
  return (
    <svg className="spark" style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2c.5 4.5 1.5 5.5 6 6-4.5 .5-5.5 1.5-6 6-.5-4.5-1.5-5.5-6-6 4.5-.5 5.5-1.5 6-6Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* brand mark: a friendly "pocket + traffic-dot" glyph (own craft) */
export function BrandMark({ light }: { light?: boolean }) {
  return (
    <svg className="brand-mark" viewBox="0 0 36 36" fill="none" aria-hidden>
      <rect x="7" y="3" width="22" height="30" rx="7" fill="#1E5BD6" />
      <rect x="7" y="3" width="22" height="30" rx="7" stroke={light ? "#A9C6F7" : "#12357D"} strokeWidth="1.5" />
      <circle className="tl-r" cx="18" cy="11" r="2.6" fill="#E5484D" />
      <circle className="tl-y" cx="18" cy="18" r="2.6" fill="#F5B301" />
      <circle className="tl-g" cx="18" cy="25" r="2.6" fill="#12996B" />
    </svg>
  );
}

/* dotted grid decoration (own craft) */
export function Dots({ style }: { style?: React.CSSProperties }) {
  const rows = 5,
    cols = 5;
  return (
    <svg className="dots drift" style={style} viewBox="0 0 100 100" fill="none" aria-hidden>
      {Array.from({ length: rows * cols }).map((_, i) => (
        <circle key={i} cx={8 + (i % cols) * 21} cy={8 + Math.floor(i / cols) * 21} r="3" fill="currentColor" />
      ))}
    </svg>
  );
}

/* ── the interactive demo card (verified q_11_16 data) ─────────────────────── */
/* Used by the body's REAL-CONTENT section AND by hero h2 «Питання одразу».
   Each instance owns independent answer-reveal state. */
export function DemoCard({ className, priority }: { className?: string; priority?: boolean }) {
  const demo = COPY.demo;
  const [picked, setPicked] = useState<number | null>(null);
  const revealed = picked !== null;
  const correctIdx = demo.options.findIndex((o) => o.correct);
  const isRight = picked === correctIdx;

  return (
    <div className={`demo-card ${className ?? ""}`}>
      <div className="demo-media">
        <span className="demo-topic">{demo.topic}</span>
        <div className="demo-imgframe">
          <Image src={demo.image} alt={demo.imageAlt} width={512} height={288} sizes="(max-width:960px) 100vw, 470px" priority={priority} />
        </div>
        <p className="demo-cap">{demo.reference}</p>
      </div>
      <div className="demo-body">
        <p className="demo-q">{demo.question}</p>
        <div className="demo-opts" role="group" aria-label="Варіанти відповіді">
          {demo.options.map((o, i) => {
            const state = !revealed ? "" : o.correct ? "correct" : i === picked ? "wrong" : "";
            return (
              <button
                key={i}
                className={`opt ${state}`}
                onClick={() => !revealed && setPicked(i)}
                disabled={revealed}
                aria-pressed={picked === i}
              >
                <span className="tick">
                  <Check className="i-ok" aria-hidden />
                  <X className="i-no" aria-hidden />
                </span>
                <span>{o.text}</span>
              </button>
            );
          })}
        </div>
        <div className="demo-status" role="status" aria-live="polite">
          {!revealed ? (
            <p className="demo-prompt">{demo.prompt}</p>
          ) : (
            <div className={`demo-reveal ${isRight ? "r-ok" : "r-no"}`}>
              <p className="demo-reveal-text">
                <b>{isRight ? "Правильно. " : "Ще ні. "}</b>
                {isRight ? demo.right : demo.wrong}
              </p>
              <span className="demo-pdr">
                <BookOpen aria-hidden /> {demo.pdrRef}
              </span>
            </div>
          )}
        </div>
        <div className="demo-foot">
          {revealed ? (
            <button className="demo-reset" onClick={() => setPicked(null)}>
              <RotateCcw aria-hidden /> Спробувати ще
            </button>
          ) : (
            <span className="demo-ref">Помилятися тут можна — це тренування, а не іспит.</span>
          )}
          <Link href={demo.link.href} className="link-arrow">
            {demo.link.label} <ArrowUpRight aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── the full page shell with a swappable hero slot ────────────────────────── */
export function V36Body({
  hero,
  navDark,
  demoHeader,
  proofSlot,
}: {
  hero: React.ReactNode;
  /** h1 «Розмітка» ships a dark full-bleed hero — the nav inverts to stay legible over it. */
  navDark?: boolean;
  /** h2 «Питання одразу» reframes the later demo section as a bridge (the card is already up top). */
  demoHeader?: { h2: string; lead: string };
  /** Proof-region slot for the p-variant routes. `undefined` (canonical) → the default
   *  statement band below; `null` → nothing; a node → that node in place of the band. */
  proofSlot?: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!root.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context((self) => {
      const q = self.selector as (s: string) => HTMLElement[];
      const mm = gsap.matchMedia();

      // Full motion — only when the visitor hasn't asked to reduce it.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Hero entrance choreography (load-in, not scroll-gated). Variant heroes
        // that opt into these class names inherit the same buoyant load-in; those
        // that don't leave q() empty (a no-op) and own their motion locally.
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(q(".hero-reveal"), { y: 24, opacity: 0, duration: 0.7, stagger: 0.09 })
          .from(q(".hero-phone"), { y: 40, opacity: 0, rotate: -10, scale: 0.94, duration: 0.9 }, "-=0.5")
          .from(q(".hero-spark"), { scale: 0, opacity: 0, duration: 0.5, stagger: 0.08 }, "-=0.4");

        // Gentle continuous float — phones bob, sparks twinkle, blobs drift.
        q(".float-phone").forEach((el, i) => {
          gsap.to(el, { y: i % 2 ? -14 : -18, duration: 3 + i * 0.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
        });
        q(".spark").forEach((el, i) => {
          gsap.to(el, { rotate: 18, scale: 1.15, duration: 1.6 + i * 0.3, ease: "sine.inOut", yoyo: true, repeat: -1 });
        });
        q(".drift").forEach((el, i) => {
          gsap.to(el, { x: i % 2 ? 22 : -22, y: i % 2 ? -16 : 18, duration: 8 + i * 1.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
        });

        // Scroll reveals — enhance an already-visible default (no CSS opacity:0).
        // fromTo + immediateRender:false means the hidden start state is NEVER
        // pre-applied: unfired reveals keep their visible default, so a print /
        // full-page capture (or any pre-scroll render) shows the whole page.
        q(".reveal").forEach((el) => {
          gsap.fromTo(
            el,
            { y: 34, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.7,
              ease: "power3.out",
              immediateRender: false,
              scrollTrigger: { trigger: el, start: "top 86%", once: true },
            },
          );
        });
        q(".reveal-stagger").forEach((grp) => {
          gsap.fromTo(
            grp.children,
            { y: 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              ease: "power3.out",
              stagger: 0.08,
              immediateRender: false,
              scrollTrigger: { trigger: grp, start: "top 84%", once: true },
            },
          );
        });
      });

      // Reduced motion — no transforms; everything is simply present (crossfade-free).
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(q(".hero-reveal, .hero-phone, .reveal"), { clearProps: "all" });
      });

      return () => mm.revert();
    }, root);

    return () => ctx.revert();
  }, []);

  const c = COPY;
  const demo = c.demo;

  return (
    <div className="v36" ref={root}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <a href="#main" className="skip">
        Перейти до вмісту
      </a>

      {/* ── NAV ── */}
      <header className={`nav ${navDark ? "on-dark" : ""} ${scrolled ? "scrolled" : ""}`}>
        <div className="wrap nav-in">
          <Link href="#main" className="brand" aria-label={`${c.brand} — на початок`}>
            <BrandMark />
            <span className="brand-text">{c.brand}</span>
          </Link>
          <nav className="nav-links" aria-label="Розділи сторінки">
            {NAV.links.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="nav-right">
            <Link href={CTA.login.href} className="nav-login">
              {CTA.login.label}
            </Link>
            <Link href={CTA.free.href} className="btn btn-primary btn-sm">
              {CTA.free.label}
            </Link>
          </div>
        </div>
        <nav className="nav-rail" aria-label="Розділи сторінки">
          <div className="nav-rail-in">
            {NAV.links.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </div>
        </nav>
      </header>

      <main id="main">
        {/* ── HERO (swappable) ── */}
        {hero}

        {/* ── PROOF BAND (swappable slot) ──
            undefined (canonical) → the default statement band; null → nothing;
            a node (p-variant routes) → that node in place of the band. */}
        {proofSlot === undefined ? (
          <div className="wrap proof">
            <div className="proof-card reveal">
              <div className="proof-top">
                <span className="chip">
                  <span className="dot" />
                  {c.proof.chip}
                </span>
              </div>
              {/* ONE unified statement: the three real figures read inline as emphasized
                  numerals inside one display-face sentence — not a grid of stat tiles. */}
              <p className="proof-say">
                {c.proof.statement.map((part, i) =>
                  part.num ? (
                    <b className="proof-num num" key={i}>{part.text}</b>
                  ) : (
                    <span key={i}>{part.text}</span>
                  ),
                )}
              </p>
            </div>
          </div>
        ) : (
          proofSlot
        )}

        {/* ── FEATURE CARDS ── */}
        <section className="sec" id="features">
          <span className="blob drift" style={{ width: 360, height: 360, top: 120, left: -120, background: "var(--blue)", opacity: 0.3 }} aria-hidden />
          <div className="wrap">
            <div className="sec-head reveal">
              <h2>{c.features.h2}</h2>
              <p>{c.features.lead}</p>
            </div>
            <div className="feat-grid reveal-stagger">
              {c.features.cards.map((f) => {
                const Ico = FEATURE_ICONS[f.key] ?? Unlock;
                return (
                  <article className={`feat ${f.tone as Tone}`} key={f.key}>
                    <span className="feat-ico">
                      <Ico aria-hidden />
                    </span>
                    <h3>{f.title}</h3>
                    <p>{f.body}</p>
                    <Link href={f.link.href} className="link-arrow feat-link">
                      {f.link.label} <ArrowUpRight aria-hidden />
                    </Link>
                    <div className="feat-phone-wrap">
                      <Phone src={f.img} alt={f.alt} className="float-phone" />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── BENEFITS ── */}
        <section className="sec" style={{ background: "var(--bg2)" }}>
          <div className="wrap">
            <div className="sec-head reveal">
              <h2>{c.benefits.h2}</h2>
            </div>
            <div className="ben-panel reveal">
              <div className="ben-grid">
                {c.benefits.items.map((b, i) => {
                  const Ico = BENEFIT_ICONS[i];
                  return (
                    <div className="ben" key={b.t}>
                      <span className="ben-ico">
                        <Ico aria-hidden />
                      </span>
                      <div className="ben-txt">
                        <h3>{b.t}</h3>
                        <p>{b.d}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── REAL-CONTENT MOMENT (mini-demo) ── */}
        <section className="sec demo" id="content">
          <span className="blob drift" style={{ width: 380, height: 380, bottom: -80, right: -100, background: "var(--green)", opacity: 0.3 }} aria-hidden />
          <div className="wrap">
            <div className="sec-head reveal">
              <h2>{demoHeader?.h2 ?? demo.h2}</h2>
              <p>{demoHeader?.lead ?? demo.lead}</p>
            </div>
            <DemoCard className="reveal" />
          </div>
        </section>

        {/* ── PRICING ── */}
        <section className="sec" id="pricing">
          <div className="wrap">
            <div className="sec-head reveal">
              <h2>{c.pricing.h2}</h2>
              <p>{c.pricing.lead}</p>
            </div>
            <div className="price-grid reveal">
              {/* Free — dominant */}
              <div className="plan plan-free">
                <div className="plan-name">{c.pricing.free.name}</div>
                <div className="plan-price">
                  <span className="p num">{c.pricing.free.price}</span>
                  <span className="plan-note">{c.pricing.free.note}</span>
                </div>
                <ul className="plan-list">
                  {c.pricing.free.items.map((it) => (
                    <li key={it}>
                      <span className="ci">
                        <Check aria-hidden />
                      </span>
                      {it}
                    </li>
                  ))}
                </ul>
                <Link href={c.pricing.free.href} className="btn btn-primary btn-lg plan-cta">
                  {c.pricing.free.cta} <ArrowRight aria-hidden />
                </Link>
              </div>
              {/* Paid — featured, quiet */}
              <div className="plan plan-paid">
                <span className="plan-badge">{c.pricing.paid.badge}</span>
                <div className="plan-name">{c.pricing.paid.name}</div>
                <div className="plan-price">
                  <span className="p num">{c.pricing.paid.price}</span>
                  <span className="plan-note">{c.pricing.paid.note}</span>
                </div>
                <ul className="plan-list">
                  {c.pricing.paid.items.map((it) => (
                    <li key={it}>
                      <span className="ci">
                        <Check aria-hidden />
                      </span>
                      {it}
                    </li>
                  ))}
                </ul>
                <Link href={c.pricing.paid.href} className="btn btn-onink btn-lg plan-cta">
                  {c.pricing.paid.cta} <ArrowRight aria-hidden />
                </Link>
                <p className="plan-honest">{c.pricing.paid.honesty}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="sec" id="faq" style={{ background: "var(--bg2)" }}>
          <div className="wrap">
            <div className="sec-head reveal">
              <h2>{c.faq.h2}</h2>
            </div>
            <div className="faq-grid reveal-stagger">
              {c.faq.items.map((it) => (
                <div className="faq-item" key={it.q}>
                  <h3>
                    <span className="qm" aria-hidden>
                      ?
                    </span>
                    {it.q}
                  </h3>
                  <p>{it.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CLOSING CTA BAND (the blue world returns to close the page) ── */}
        <section className="sec finalcta" id="start">
          <div className="wrap">
            <div className="finalcta-inner reveal">
              <h2>{c.finalCta.h2}</h2>
              <p>{c.finalCta.lead}</p>
              <div className="finalcta-cta">
                <Link href={c.finalCta.primary.href} className="btn btn-lg btn-yellow">
                  {c.finalCta.primary.label} <ArrowRight aria-hidden />
                </Link>
                <Link href={c.finalCta.secondary.href} className="btn btn-lg btn-onblue">
                  {c.finalCta.secondary.label}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="foot">
        <span className="blob" style={{ width: 380, height: 380, top: -140, left: "30%", background: "var(--blue)", opacity: 0.35 }} aria-hidden />
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <div className="foot-brand">
                <BrandMark light />
                {c.brand}
              </div>
              <p className="foot-tag">{c.footer.tagline}</p>
            </div>
            {c.footer.columns.map((col) => (
              <div className="foot-col" key={col.title}>
                <h4>{col.title}</h4>
                {col.links.map((l) => (
                  <a key={l.href} href={l.href}>
                    {l.label}
                  </a>
                ))}
              </div>
            ))}
            <div className="foot-qr">
              <div className="foot-qr-frame">
                <Image src="/lp/v36-qr.png" alt="QR-код для відкриття Drivers School на телефоні" width={126} height={126} />
              </div>
              <div className="foot-qr-lab">{c.footer.qrLabel}</div>
              <div className="foot-qr-note">{c.footer.qrNote}</div>
            </div>
          </div>
          <div className="foot-legal">
            <p className="foot-disc">{c.footer.disclaimer}</p>
            <p className="foot-cr">{c.footer.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
