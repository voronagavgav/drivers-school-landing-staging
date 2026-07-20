"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { Check, ArrowRight, ArrowUpRight } from "lucide-react";
import { COPY, NAV, CTA } from "./copy";

/* ══════════════════════════════════════════════════════════════════════════
   v34 «Школа Salient» — a light, warm, trust-forward consumer landing that
   replicates the proven Salient anatomy 1:1 in section order and rhythm,
   restyled as our own school:
     · warm near-white ground · one terracotta accent + one deep warm ink
     · soft blurred colour blobs behind key sections
     · one hand-drawn underline doodle on the hero's key word (drawn here)
     · every slot a REAL asset: real product screenshots + real ПДР images
   All CSS/SVG is our own craft — nothing fetched or transcribed. Scoped .v34.
   ══════════════════════════════════════════════════════════════════════════ */

const STYLES = `
html{scroll-behavior:smooth;}
.v34 section[id]{scroll-margin-top:86px;}
.v34{
  --bg:#FBF8F3; --bg2:#F4EEE4; --surface:#FFFFFF;
  --ink:#241C15; --ink-soft:#3B2E23; --muted:#6C5D4F;
  --line:#ECE3D6; --line-soft:#F3ECE1;
  --accent:#D65C33; --accent-600:#BC4A26; --accent-700:#A23E1F;
  --accent-tint:#FBEBE2; --gold:#E7A23A; --sage:#7C8A6A;
  --cream:#F6EFE4; --cream-soft:#E9DFCF;
  --r:18px; --r-sm:12px; --r-lg:26px;
  --blob-blur:60px;
  --sp-section:88px; --sp-section-tight:20px;
  background:var(--bg); color:var(--ink);
  font-family:var(--font-sans),system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
  letter-spacing:-0.011em; line-height:1.6;
  overflow-x:clip;
}
.v34 *{box-sizing:border-box;}
.v34 ::selection{background:rgba(214,92,51,.18);}
.v34 h1,.v34 h2,.v34 h3{
  font-weight:800; letter-spacing:-0.032em; line-height:1.04;
  text-wrap:balance; color:var(--ink); margin:0;
}
.v34 p{margin:0;}
.v34 a{color:inherit;text-decoration:none;}
.v34 .num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1;}
.v34 .sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}
.v34 .skip{position:fixed;top:12px;left:12px;z-index:80;background:var(--ink);color:#fff;font-weight:700;
  padding:10px 16px;border-radius:12px;transform:translateY(-200%);transition:transform .18s;}
.v34 .skip:focus{transform:translateY(0);}
.v34 :focus-visible{outline:2.5px solid var(--accent);outline-offset:3px;border-radius:6px;}
/* On accent/ink-filled controls the accent ring blends into the control — contrast it against the fill, not the page. */
.v34 .btn-primary:focus-visible{outline-color:var(--ink);}
.v34 .band .btn:focus-visible,.v34 .price-paid .btn:focus-visible,.v34 .panel .vtab:focus-visible{outline-color:#fff;}

/* shell */
.v34 .wrap{max-width:1180px;margin:0 auto;padding:0 24px;}

/* buttons */
.v34 .btn{display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:1rem;
  border-radius:999px;padding:13px 24px;cursor:pointer;border:1px solid transparent;
  transition:transform .16s cubic-bezier(.2,.7,.3,1),box-shadow .2s,background .2s,color .2s;white-space:nowrap;}
.v34 .btn:active{transform:translateY(1px);}
.v34 .btn-primary{background:var(--accent-600);color:#fff;box-shadow:0 8px 22px -10px rgba(188,74,38,.75);}
.v34 .btn-primary:hover{background:var(--accent-700);box-shadow:0 12px 28px -10px rgba(188,74,38,.85);transform:translateY(-1px);}
.v34 .btn-ghost{background:transparent;color:var(--ink);border-color:var(--line);}
.v34 .btn-ghost:hover{background:var(--surface);border-color:var(--cream-soft);transform:translateY(-1px);}
.v34 .btn-light{background:var(--surface);color:var(--ink);border-color:var(--line);}
.v34 .btn-light:hover{background:#fff;box-shadow:0 10px 24px -14px rgba(36,28,21,.4);transform:translateY(-1px);}
.v34 .btn-onink{background:var(--cream);color:var(--ink);}
.v34 .btn-onink:hover{background:#fff;transform:translateY(-1px);}
.v34 .btn-sm{padding:10px 18px;font-size:.94rem;}
.v34 .cta-short{display:none;}
.v34 .btn svg{width:17px;height:17px;}
/* DELIGHT — the primary CTA's arrow leans into the direction it promises (mirrors the .link-arrow nudge). */
.v34 .btn-primary svg,.v34 .btn-onink svg{transition:transform .2s cubic-bezier(.2,.7,.3,1);}
.v34 .btn-primary:hover svg,.v34 .btn-onink:hover svg{transform:translateX(3px);}
.v34 .link-arrow{display:inline-flex;align-items:center;gap:5px;font-weight:700;color:var(--accent-700);}
.v34 .link-arrow svg{width:15px;height:15px;transition:transform .18s;}
.v34 .link-arrow:hover svg{transform:translate(2px,-2px);}

/* nav */
.v34 .nav{position:sticky;top:0;z-index:60;background:rgba(251,248,243,.82);
  backdrop-filter:saturate(150%) blur(12px);-webkit-backdrop-filter:saturate(150%) blur(12px);
  border-bottom:1px solid transparent;transition:border-color .25s,box-shadow .25s;}
.v34 .nav.scrolled{border-color:var(--line);box-shadow:0 6px 24px -18px rgba(36,28,21,.4);}
.v34 .nav-in{display:flex;align-items:center;gap:22px;height:70px;}
.v34 .brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.12rem;letter-spacing:-0.03em;white-space:nowrap;}
/* DELIGHT — hover the wordmark and its little traffic light quietly goes green: the school's «рушай» in a glyph. */
.v34 .brand .mark-go{transform-box:fill-box;transform-origin:center;transition:transform .28s cubic-bezier(.2,.7,.3,1),filter .28s;}
.v34 .brand:hover .mark-go{transform:scale(1.16);filter:drop-shadow(0 0 2.4px rgba(143,197,140,.95));}
.v34 .nav-links{display:flex;gap:6px;margin-left:12px;}
.v34 .nav-links a{padding:8px 12px;border-radius:10px;font-weight:600;font-size:.96rem;color:var(--ink-soft);transition:background .18s,color .18s;}
.v34 .nav-links a:hover{background:var(--bg2);color:var(--ink);}
.v34 .nav-right{margin-left:auto;display:flex;align-items:center;gap:10px;}

/* blobs */
.v34 .blob{position:absolute;border-radius:50%;filter:blur(var(--blob-blur));opacity:.5;pointer-events:none;z-index:0;}

/* hero */
.v34 .hero{position:relative;overflow:hidden;padding:78px 0 30px;}
/* DELIGHT — a hair of paper tooth over the warm ground; reads as printed-workbook grain up close, gone in a thumbnail. Inline SVG, zero network weight. */
.v34 .hero::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;opacity:.32;mix-blend-mode:multiply;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Cfilter id='v34grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='150' height='150' filter='url(%23v34grain)' opacity='0.5'/%3E%3C/svg%3E");}
.v34 .hero-in{position:relative;z-index:2;max-width:1000px;margin:0 auto;text-align:center;}
.v34 .kicker{display:inline-block;font-weight:700;font-size:.83rem;letter-spacing:.01em;
  color:var(--accent-700);background:var(--accent-tint);border:1px solid #F4D8C9;
  padding:7px 15px;border-radius:999px;margin-bottom:24px;}
.v34 h1{font-size:clamp(2.15rem,5.2vw,3.6rem);line-height:1.05;}
.v34 .doodle-word{position:relative;white-space:nowrap;color:var(--accent-700);}
.v34 .doodle{position:absolute;left:-4%;right:-4%;bottom:-.28em;width:108%;height:.42em;overflow:visible;z-index:-1;}
.v34 .doodle path{fill:none;stroke:var(--accent);stroke-width:9;stroke-linecap:round;}
.v34 .hero-sub{font-size:clamp(1.05rem,1.6vw,1.24rem);color:var(--muted);max-width:640px;
  margin:24px auto 0;line-height:1.62;}
.v34 .hero-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:34px;}
.v34 .hero-note{margin-top:18px;font-size:.9rem;color:var(--muted);}
.v34 .hero-note b{color:var(--ink);font-weight:700;}

/* proof strip */
.v34 .proof{position:relative;z-index:2;margin-top:44px;}
.v34 .proof-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);
  padding:26px 20px;box-shadow:0 30px 60px -44px rgba(36,28,21,.5);}
.v34 .proof-lead{text-align:center;font-weight:700;color:var(--muted);font-size:.92rem;margin-bottom:20px;}
.v34 .proof-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}
.v34 .proof-cell{text-align:center;padding:6px 8px;position:relative;}
.v34 .proof-cell + .proof-cell::before{content:"";position:absolute;left:0;top:14%;height:72%;width:1px;background:var(--line);}
.v34 .proof-val{font-size:clamp(1.7rem,3.4vw,2.5rem);font-weight:800;letter-spacing:-.04em;line-height:1;color:var(--ink);}
.v34 .proof-lab{margin-top:9px;font-size:.85rem;color:var(--muted);line-height:1.35;}

/* section rhythm */
.v34 .sec{padding:var(--sp-section) 0;position:relative;}
.v34 .sec-tight{padding-top:var(--sp-section-tight);}
.v34 .sec-head{max-width:680px;margin:0 auto 44px;text-align:center;}
.v34 .sec-head h2{font-size:clamp(1.9rem,4vw,2.85rem);}
.v34 .sec-head p{margin-top:16px;color:var(--muted);font-size:clamp(1.02rem,1.4vw,1.15rem);line-height:1.6;}

/* PRIMARY features — deep ink panel */
.v34 .panel{position:relative;overflow:hidden;background:var(--ink);color:var(--cream);
  border-radius:34px;padding:clamp(30px,4vw,58px);box-shadow:0 50px 90px -50px rgba(36,28,21,.7);}
.v34 .panel h2{color:#fff;}
.v34 .panel .sec-head{margin-bottom:40px;}
.v34 .panel .sec-head p{color:rgba(246,239,228,.72);}
.v34 .panel-grid{position:relative;z-index:2;display:grid;grid-template-columns:.82fr 1.18fr;gap:clamp(26px,3.4vw,54px);align-items:center;}
.v34 .vtabs{display:flex;flex-direction:column;gap:10px;}
.v34 .vtab{text-align:left;background:transparent;border:1px solid transparent;border-radius:16px;
  padding:17px 19px;cursor:pointer;color:rgba(246,239,228,.66);transition:background .2s,color .2s,border-color .2s;}
.v34 .vtab:hover{background:rgba(246,239,228,.05);color:var(--cream);}
.v34 .vtab.on{background:rgba(246,239,228,.08);border-color:rgba(246,239,228,.16);color:#fff;}
.v34 .vtab-t{font-weight:800;font-size:1.12rem;letter-spacing:-.02em;display:flex;align-items:center;gap:10px;}
.v34 .vtab-dot{width:9px;height:9px;border-radius:50%;background:rgba(246,239,228,.28);transition:background .2s,box-shadow .2s;flex:none;}
.v34 .vtab.on .vtab-dot{background:var(--accent);box-shadow:0 0 0 4px rgba(214,92,51,.22);}
.v34 .vtab-b{margin-top:7px;font-size:.94rem;line-height:1.5;color:inherit;opacity:.9;}
.v34 .vtab.on .vtab-b{opacity:1;}

/* browser frame */
.v34 .frame{background:#fff;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,.14);
  box-shadow:0 40px 80px -40px rgba(0,0,0,.7);}
.v34 .frame-bar{display:flex;align-items:center;gap:7px;padding:11px 14px;background:#F0EAE0;border-bottom:1px solid #E4DACB;}
.v34 .frame-dot{width:11px;height:11px;border-radius:50%;}
.v34 .frame-url{margin-left:12px;flex:1;height:22px;background:#fff;border:1px solid #E4DACB;border-radius:7px;
  display:flex;align-items:center;padding:0 12px;font-size:.72rem;color:#7A6E5E;font-weight:600;max-width:280px;}
/* Fixed-aspect box so the frame never changes height when the active tab's screenshot swaps. */
.v34 .frame-shot{position:relative;background:#fff;}
.v34 .frame-shot img{display:block;width:100%;aspect-ratio:2.2/1;object-fit:cover;object-position:top;}
.v34 .shot-fade{position:relative;}
.v34 .shot-fade::after{content:"";position:absolute;inset:auto 0 0 0;height:52px;
  background:linear-gradient(to bottom,rgba(255,255,255,0),#fff);pointer-events:none;}

/* SECONDARY features */
.v34 .htabs{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:38px;}
.v34 .htab{background:var(--surface);border:1px solid var(--line);border-radius:999px;
  padding:11px 20px;font-weight:700;font-size:.96rem;color:var(--muted);cursor:pointer;transition:background .18s,color .18s,border-color .18s;}
.v34 .htab:hover{color:var(--ink);border-color:var(--cream-soft);}
.v34 .htab.on{background:var(--ink);color:var(--cream);border-color:var(--ink);}
.v34 .sfeat{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,4vw,60px);align-items:center;max-width:1000px;margin:0 auto;}
.v34 .sfeat-txt h3{font-size:clamp(1.5rem,2.6vw,2rem);}
.v34 .sfeat-txt p{margin-top:16px;color:var(--muted);font-size:1.08rem;line-height:1.6;}
.v34 .sfeat-txt .link-arrow{margin-top:22px;}
.v34 .frame-lite{background:#fff;border-radius:16px;overflow:hidden;border:1px solid var(--line);
  box-shadow:0 34px 66px -40px rgba(36,28,21,.55);}
.v34 .frame-lite .frame-bar{background:var(--cream);border-color:var(--line);}
/* Secondary screens differ in native shape (16:9 … near-square); a fixed box + contain keeps the
   frame height stable across tab switches without cropping the timer/answer detail out of frame. */
.v34 .frame-lite img{display:block;width:100%;aspect-ratio:2.2/1;object-fit:contain;object-position:top;background:var(--bg2);}

/* CTA band */
.v34 .band{position:relative;overflow:hidden;background:var(--accent-600);color:#fff;
  border-radius:34px;padding:clamp(44px,6vw,76px) clamp(28px,4vw,56px);text-align:center;
  box-shadow:0 50px 90px -50px rgba(188,74,38,.8);}
.v34 .band h2{color:#fff;font-size:clamp(1.9rem,4vw,2.85rem);position:relative;z-index:2;}
.v34 .band p{position:relative;z-index:2;color:#fff;max-width:520px;margin:16px auto 0;font-size:1.1rem;line-height:1.55;}
.v34 .band .btn{position:relative;z-index:2;margin-top:30px;}

/* real-content grid */
.v34 .qgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;}
.v34 .qcard{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;
  box-shadow:0 24px 48px -40px rgba(36,28,21,.5);transition:transform .22s,box-shadow .22s;}
.v34 .qcard:nth-child(3n+2){transform:translateY(16px);}
.v34 .qcard:hover{transform:translateY(-4px);box-shadow:0 34px 60px -38px rgba(36,28,21,.6);}
.v34 .qcard:nth-child(3n+2):hover{transform:translateY(12px);}
.v34 .qshot{aspect-ratio:16/8;background:var(--bg2);overflow:hidden;border-bottom:1px solid var(--line);}
.v34 .qshot img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s cubic-bezier(.2,.7,.3,1);}
/* DELIGHT — lifting a real-question card leans you a touch closer into its illustration, like squinting at the plate. */
.v34 .qcard:hover .qshot img{transform:scale(1.045);}
.v34 .qcard:hover .qshot.contain img{transform:scale(1.06);}
/* Sign-plate keys have a stark white ground + tall native ratio; cover clips the plate, so fit
   them WHOLE on the warm card ground instead. */
.v34 .qshot.contain img{object-fit:contain;padding:14px;}
.v34 .qbody{padding:18px 20px 22px;}
.v34 .qtopic{display:inline-block;font-weight:700;font-size:.76rem;letter-spacing:.02em;text-transform:uppercase;
  color:var(--accent-700);background:var(--accent-tint);padding:4px 11px;border-radius:999px;}
.v34 .qtext{margin-top:13px;font-weight:600;font-size:1.02rem;line-height:1.4;color:var(--ink);}
.v34 .qnote{text-align:center;margin-top:32px;font-size:.9rem;color:var(--muted);}

/* pricing */
.v34 .prices{display:grid;grid-template-columns:1fr 1fr;gap:26px;max-width:900px;margin:0 auto;align-items:start;}
.v34 .price{border-radius:26px;padding:34px 32px;position:relative;}
.v34 .price-free{background:var(--surface);border:1px solid var(--line);box-shadow:0 30px 60px -46px rgba(36,28,21,.5);}
.v34 .price-paid{background:var(--ink);color:var(--cream);box-shadow:0 44px 84px -46px rgba(36,28,21,.75);
  outline:2px solid var(--accent);outline-offset:-2px;}
.v34 .price-name{font-weight:800;font-size:1.2rem;letter-spacing:-.02em;}
.v34 .price-paid .price-name{color:#fff;}
.v34 .price-badge{position:absolute;top:-13px;left:32px;background:var(--accent);color:#fff;font-weight:700;
  font-size:.78rem;padding:5px 14px;border-radius:999px;box-shadow:0 8px 18px -8px rgba(188,74,38,.8);}
.v34 .price-amt{display:flex;align-items:baseline;gap:9px;margin:14px 0 4px;}
.v34 .price-amt b{font-size:clamp(2.2rem,4vw,2.9rem);font-weight:800;letter-spacing:-.04em;}
.v34 .price-amt .cur{font-size:.5em;font-weight:700;letter-spacing:-.02em;margin-left:.14em;vertical-align:.16em;color:inherit;}
.v34 .price-note{font-size:.9rem;color:var(--muted);}
.v34 .price-paid .price-note{color:rgba(246,239,228,.68);}
.v34 .price ul{list-style:none;padding:0;margin:22px 0 26px;display:flex;flex-direction:column;gap:13px;}
.v34 .price li{display:flex;gap:11px;align-items:flex-start;font-size:.99rem;line-height:1.45;}
.v34 .price li svg{width:18px;height:18px;flex:none;margin-top:2px;color:var(--accent);}
.v34 .price-paid li svg{color:var(--gold);}
.v34 .price .btn{width:100%;justify-content:center;}
.v34 .price-fine{margin-top:16px;font-size:.85rem;line-height:1.5;}
.v34 .price-fine .neg{color:var(--ink);font-weight:700;}
.v34 .price-paid .price-fine .neg{color:#fff;}
.v34 .price-paid .price-fine{color:rgba(246,239,228,.72);}
.v34 .price-fine .honesty{display:block;margin-top:5px;}

/* faq */
.v34 .faq-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:26px 34px;max-width:1060px;margin:0 auto;}
.v34 .faq-item h3{font-size:1.08rem;font-weight:800;letter-spacing:-.02em;}
.v34 .faq-item p{margin-top:10px;color:var(--muted);font-size:.98rem;line-height:1.58;}

/* footer */
.v34 .foot{background:var(--ink);color:var(--cream);padding:56px 0 40px;}
.v34 .foot-top{display:flex;flex-wrap:wrap;gap:24px;align-items:center;justify-content:space-between;
  padding-bottom:28px;border-bottom:1px solid rgba(246,239,228,.14);}
.v34 .foot .brand{color:#fff;}
.v34 .foot-links{display:flex;gap:20px;flex-wrap:wrap;}
.v34 .foot-links a{color:rgba(246,239,228,.72);font-weight:600;font-size:.95rem;transition:color .18s;}
.v34 .foot-links a:hover{color:#fff;}
.v34 .foot-tag{color:rgba(246,239,228,.7);margin-top:16px;font-size:1.02rem;max-width:420px;}
.v34 .foot-legal{margin-top:26px;font-size:.82rem;line-height:1.6;color:rgba(246,239,228,.62);max-width:760px;}
.v34 .foot-copy{margin-top:20px;font-size:.85rem;color:rgba(246,239,228,.6);font-weight:600;}

/* responsive */
@media (max-width:900px){
  .v34 .nav-links{display:none;}
  .v34 .panel-grid{grid-template-columns:1fr;gap:26px;}
  .v34 .vtabs{flex-direction:row;overflow-x:auto;gap:8px;margin:0 -6px;padding:2px 6px;scrollbar-width:none;align-items:flex-start;}
  /* Inactive tabs (label only) would float mid-height beside the tall active card — top-align them. */
  .v34 .vtab{min-width:210px;display:flex;flex-direction:column;justify-content:flex-start;align-self:flex-start;}
  .v34 .vtab-b{display:none;}
  .v34 .vtab.on .vtab-b{display:block;}
  .v34 .sfeat{grid-template-columns:1fr;gap:26px;}
  .v34 .qgrid{grid-template-columns:repeat(2,1fr);}
  .v34 .qcard:nth-child(3n+2){transform:none;}
  .v34 .qcard:nth-child(3n+2):hover{transform:translateY(-4px);}
  .v34 .prices{grid-template-columns:1fr;}
  .v34 .faq-grid{grid-template-columns:1fr 1fr;}
}
@media (max-width:600px){
  .v34 .nav-in{gap:10px;height:64px;}
  .v34 .nav-right{gap:4px;}
  /* Keep «Увійти» reachable for returning students — as a compact borderless text link, not hidden. */
  .v34 .nav-right .btn-ghost{padding:8px 8px;border-color:transparent;background:transparent;}
  .v34 .nav-right .btn-primary{padding:9px 15px;font-size:.9rem;}
  .v34 .brand{font-size:1.02rem;gap:8px;}
  .v34 .cta-full{display:none;}
  .v34 .cta-short{display:inline;}
  .v34 .proof-grid{grid-template-columns:1fr 1fr;gap:20px 8px;}
  .v34 .proof-cell:nth-child(3)::before,.v34 .proof-cell + .proof-cell::before{display:none;}
  .v34 .qgrid{grid-template-columns:1fr;}
  /* Trust point is made by card 3; keep pricing within reach on phone. */
  .v34 .qcard:nth-child(n+4){display:none;}
  .v34 .qnote{margin-top:24px;}
  .v34 .faq-grid{grid-template-columns:1fr;}
  .v34 .hero{padding-top:52px;}
  .v34 .sec{padding:64px 0;}
}
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto;}
  .v34 *{animation:none!important;transition:none!important;}
}
`;

/* ── hand-drawn underline doodle (drawn here, our own) ─────────────────────── */
function Doodle() {
  return (
    <svg className="v34-doodle doodle" viewBox="0 0 300 26" preserveAspectRatio="none" aria-hidden="true">
      <path d="M4 17 C 52 8, 104 6, 156 9 C 208 12, 258 12, 296 6" />
      <path d="M10 23 C 70 18, 150 19, 292 15" style={{ strokeWidth: 5, opacity: 0.55 }} />
    </svg>
  );
}

export default function V34Page() {
  const [ptab, setPtab] = useState(0);
  const [stab, setStab] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const sfeatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Motion lives entirely inside gsap.matchMedia with a reduced-motion branch.
  // gsap.from enhances an already-visible SSR default (no visibility gating).
  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".v34-rise", {
          y: 20,
          opacity: 0,
          duration: 0.7,
          stagger: 0.09,
          ease: "power3.out",
        });
        gsap.fromTo(
          ".v34-doodle path",
          { strokeDasharray: 320, strokeDashoffset: 320 },
          { strokeDashoffset: 0, duration: 0.95, delay: 0.55, ease: "power2.out" },
        );
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  // Tab-switch crossfade: the frame swaps its screenshot with a soft fade instead of a cold remount.
  // Guarded by matchMedia — under prefers-reduced-motion nothing animates and the frame stays visible.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(el, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" });
    });
    return () => mm.revert();
  }, [ptab]);

  useEffect(() => {
    const el = sfeatRef.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(el, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" });
    });
    return () => mm.revert();
  }, [stab]);

  const pf = COPY.features.tabs[ptab];
  const sf = COPY.secondary.tabs[stab];

  return (
    <div className="v34" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <a href="#main" className="skip">Перейти до вмісту</a>

      {/* NAV */}
      <header className={`nav${scrolled ? " scrolled" : ""}`}>
        <div className="wrap nav-in">
          <a href="#top" className="brand" aria-label={COPY.brand}>
            <Mark />
            {COPY.brand}
          </a>
          <nav className="nav-links" aria-label="Розділи">
            {NAV.links.map((l) => (
              <a key={l.href} href={l.href}>{l.label}</a>
            ))}
          </nav>
          <div className="nav-right">
            <Link href={CTA.login.href} className="btn btn-ghost btn-sm">{CTA.login.label}</Link>
            <Link href={CTA.free.href} className="btn btn-primary btn-sm">
              <span className="cta-full">{CTA.free.label}</span>
              <span className="cta-short">Почати</span>
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        <span id="top" />

        {/* HERO */}
        <section className="hero">
          <div className="blob" style={{ width: 460, height: 460, top: -120, left: "8%", background: "radial-gradient(circle,#F3C9A0,transparent 70%)" }} />
          <div className="blob" style={{ width: 420, height: 420, top: -60, right: "6%", background: "radial-gradient(circle,#F1B39A,transparent 70%)", opacity: 0.42 }} />
          <div className="blob" style={{ width: 380, height: 380, top: 120, left: "38%", background: "radial-gradient(circle,#DCE3C6,transparent 70%)", opacity: 0.4 }} />
          <div className="wrap hero-in">
            <span className="kicker v34-rise">{COPY.hero.kicker}</span>
            <h1 className="v34-rise">
              {COPY.hero.headBefore}
              <span className="num" style={{ color: "var(--ink)" }}>{COPY.hero.headStat}</span>
              {COPY.hero.headAfter}
              <span className="doodle-word">{COPY.hero.headDoodle}<Doodle /></span>
              {COPY.hero.headEnd}
            </h1>
            <p className="hero-sub v34-rise">{COPY.hero.sub}</p>
            <div className="hero-cta v34-rise">
              <Link href={CTA.free.href} className="btn btn-primary">{CTA.free.label}<ArrowRight /></Link>
              <Link href={CTA.tryNow.href} className="btn btn-ghost">{CTA.tryNow.label}<ArrowUpRight /></Link>
            </div>
            <p className="hero-note v34-rise">{COPY.hero.ctaNote}</p>
          </div>

          {/* PROOF STRIP */}
          <div className="wrap proof v34-rise">
            <div className="proof-card">
              <p className="proof-lead">{COPY.proof.lead}</p>
              <div className="proof-grid">
                {COPY.proof.stats.map((s) => (
                  <div className="proof-cell" key={s.label}>
                    <div className="proof-val num">{s.value}</div>
                    <div className="proof-lab">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PRIMARY FEATURES — deep panel */}
        <section className="sec" id="features">
          <div className="wrap">
            <div className="panel">
              <div className="blob" style={{ width: 520, height: 520, bottom: -220, right: -120, background: "radial-gradient(circle,#D65C33,transparent 68%)", opacity: 0.55, filter: "blur(80px)" }} />
              <div className="blob" style={{ width: 380, height: 380, top: -160, left: -100, background: "radial-gradient(circle,#E7A23A,transparent 70%)", opacity: 0.28, filter: "blur(80px)" }} />
              <div className="sec-head">
                <h2>{COPY.features.h2}</h2>
                <p>{COPY.features.lead}</p>
              </div>
              <div className="panel-grid">
                <div className="vtabs" role="group" aria-label="Можливості">
                  {COPY.features.tabs.map((t, i) => (
                    <button
                      key={t.key}
                      type="button"
                      aria-pressed={i === ptab}
                      className={`vtab${i === ptab ? " on" : ""}`}
                      onClick={() => setPtab(i)}
                    >
                      <span className="vtab-t"><span className="vtab-dot" />{t.tab}</span>
                      <span className="vtab-b">{t.body}</span>
                    </button>
                  ))}
                </div>
                <div className="frame" ref={frameRef}>
                  <div className="frame-bar">
                    <span className="frame-dot" style={{ background: "#F0846A" }} />
                    <span className="frame-dot" style={{ background: "#F1C15A" }} />
                    <span className="frame-dot" style={{ background: "#8FC58C" }} />
                    <span className="frame-url">drivers.school / {pf.tab.toLowerCase()}</span>
                  </div>
                  <div className="frame-shot">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pf.img} alt={pf.alt} width={pf.w} height={pf.h} loading="lazy" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECONDARY FEATURES */}
        <section className="sec sec-tight">
          <div className="wrap">
            <div className="sec-head">
              <h2>{COPY.secondary.h2}</h2>
            </div>
            <div className="htabs" role="group" aria-label="Ще можливості">
              {COPY.secondary.tabs.map((t, i) => (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={i === stab}
                  className={`htab${i === stab ? " on" : ""}`}
                  onClick={() => setStab(i)}
                >
                  {t.tab}
                </button>
              ))}
            </div>
            <div className="sfeat" ref={sfeatRef}>
              <div className="sfeat-txt">
                <h3>{sf.title}</h3>
                <p>{sf.body}</p>
                <Link href={CTA.anon.href} className="link-arrow">Спробувати<ArrowUpRight /></Link>
              </div>
              <div className="frame-lite">
                <div className="frame-bar">
                  <span className="frame-dot" style={{ background: "#F0846A" }} />
                  <span className="frame-dot" style={{ background: "#F1C15A" }} />
                  <span className="frame-dot" style={{ background: "#8FC58C" }} />
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sf.img} alt={sf.alt} width={sf.w} height={sf.h} loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        {/* CTA BAND */}
        <section className="sec sec-tight">
          <div className="wrap">
            <div className="band">
              <div className="blob" style={{ width: 460, height: 460, top: -200, left: -80, background: "radial-gradient(circle,#F1C15A,transparent 70%)", opacity: 0.4, filter: "blur(70px)" }} />
              <div className="blob" style={{ width: 420, height: 420, bottom: -220, right: -60, background: "radial-gradient(circle,#A23E1F,transparent 70%)", opacity: 0.5, filter: "blur(70px)" }} />
              <h2>{COPY.band.h2}</h2>
              <p>{COPY.band.sub}</p>
              <Link href={CTA.anon.href} className="btn btn-onink">{COPY.band.cta}<ArrowRight /></Link>
            </div>
          </div>
        </section>

        {/* REAL-CONTENT GRID */}
        <section className="sec" id="questions">
          <div className="wrap">
            <div className="sec-head">
              <h2>{COPY.questions.h2}</h2>
              <p>{COPY.questions.lead}</p>
            </div>
            <div className="qgrid">
              {COPY.questions.cards.map((c) => (
                <article className="qcard" key={c.key}>
                  <div className={`qshot${"fit" in c && c.fit === "contain" ? " contain" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/restyled-live/${c.key}.png`} alt={`Ілюстрація до питання: ${c.topic}`} loading="lazy" />
                  </div>
                  <div className="qbody">
                    <span className="qtopic">{c.topic}</span>
                    <p className="qtext">{c.q}</p>
                  </div>
                </article>
              ))}
            </div>
            <p className="qnote">{COPY.questions.note}</p>
          </div>
        </section>

        {/* PRICING */}
        <section className="sec" id="pricing" style={{ background: "var(--bg2)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
          <div className="wrap">
            <div className="sec-head">
              <h2>{COPY.pricing.h2}</h2>
              <p>{COPY.pricing.lead}</p>
            </div>
            <div className="prices">
              {/* FREE */}
              <div className="price price-free">
                <div className="price-name">{COPY.pricing.free.name}</div>
                <div className="price-amt"><b className="num">{COPY.pricing.free.price}<span className="cur">₴</span></b><span className="price-note">{COPY.pricing.free.note}</span></div>
                <ul>
                  {COPY.pricing.free.items.map((it) => (
                    <li key={it}><Check strokeWidth={3} />{it}</li>
                  ))}
                </ul>
                <Link href={CTA.free.href} className="btn btn-primary">{COPY.pricing.free.cta}<ArrowRight /></Link>
              </div>
              {/* PAID — featured */}
              <div className="price price-paid">
                <span className="price-badge">{COPY.pricing.paid.badge}</span>
                <div className="price-name">{COPY.pricing.paid.name}</div>
                <div className="price-amt"><b className="num">{COPY.pricing.paid.price}<span className="cur">₴</span></b><span className="price-note">{COPY.pricing.paid.note}</span></div>
                <ul>
                  {COPY.pricing.paid.items.map((it) => (
                    <li key={it}><Check strokeWidth={3} />{it}</li>
                  ))}
                </ul>
                <Link href={CTA.free.href} className="btn btn-onink">{COPY.pricing.paid.cta}<ArrowRight /></Link>
                <p className="price-fine">
                  <span className="neg">{COPY.pricing.paid.negation}</span>
                  <span className="honesty">{COPY.pricing.paid.honesty}</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="sec" id="faq">
          <div className="wrap">
            <div className="sec-head">
              <h2>{COPY.faq.h2}</h2>
            </div>
            <div className="faq-grid">
              {COPY.faq.items.map((f) => (
                <div className="faq-item" key={f.q}>
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="foot">
        <div className="wrap">
          <div className="foot-top">
            <div>
              <span className="brand"><Mark />{COPY.brand}</span>
              <p className="foot-tag">{COPY.footer.tagline}</p>
            </div>
            <nav className="foot-links" aria-label="Підвал">
              {NAV.links.map((l) => (
                <a key={l.href} href={l.href}>{l.label}</a>
              ))}
              <Link href={CTA.login.href}>{CTA.login.label}</Link>
            </nav>
          </div>
          <p className="foot-legal">{COPY.footer.disclaimer}</p>
          <p className="foot-copy num">{COPY.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}

/* ── wordmark glyph (our own SVG: a soft traffic-light lozenge) ────────────── */
function Mark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" style={{ flex: "none" }}>
      <rect x="6.5" y="1.5" width="13" height="23" rx="6.5" fill="var(--ink)" />
      <circle cx="13" cy="7" r="2.4" fill="#F0846A" />
      <circle cx="13" cy="13" r="2.4" fill="#F1C15A" />
      <circle className="mark-go" cx="13" cy="19" r="2.4" fill="#8FC58C" />
    </svg>
  );
}
