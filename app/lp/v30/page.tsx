"use client";

import { useEffect, useRef, useState, useMemo, useCallback, useId } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Check,
  X,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import { COPY, HERO, CTA } from "./copy";

gsap.registerPlugin(ScrollTrigger);

/* ══════════════════════════════════════════════════════════════════════════
   «Розбір» — клінічно-спокійна теплокарта. Scoped under .v30.
   Cool teal-tinted light · Piazzolla serif instrumentation · one vermillion
   accent doing double duty (heat maximum + CTA). All CSS/SVG, no photography.
   ══════════════════════════════════════════════════════════════════════════ */
const STYLES = `
.v30{
  --bg:#F2F6F6; --surface:#FBFDFD; --ink:#1E3436; --muted:#52696C;
  --line:#DCE6E6; --accent:#E4572E; --accent-ink:#B23D1B; --dark:#14282A;
  --h0:#DAE4E4; --h1:#EBC0AC; --h2:#E4572E;
  --ok:#2f7d5b; --ok-bg:#eef7f1; --ok-line:#bfe0cd;
  background:var(--bg); color:var(--ink);
  font-family:var(--font-body),system-ui,sans-serif;
  -webkit-font-smoothing:antialiased; letter-spacing:-0.006em;
  overflow-x:clip; /* NOT hidden — a hidden scroll container disables the descendant sticky nav */
}
.v30 *{box-sizing:border-box;}
.v30 ::selection{background:rgba(228,87,46,.18);}
.v30 h1,.v30 h2,.v30 h3,.v30 .ser{
  font-family:var(--font-display),Georgia,serif; font-weight:600;
  letter-spacing:-0.02em; line-height:1.04; text-wrap:balance; color:var(--ink);
}
.v30 a{color:inherit;text-decoration:none;}
.v30 .num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1;}
.v30 .sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}
.v30 .skip{position:fixed;top:10px;left:10px;z-index:60;background:var(--dark);color:#fff;font-weight:600;
  padding:10px 16px;border-radius:10px;transform:translateY(-200%);transition:transform .2s;}
.v30 .skip:focus-visible{transform:none;outline:2px solid var(--accent);outline-offset:2px;}

/* layout */
.v30 .wrap{max-width:1120px;margin-inline:auto;padding-inline:clamp(20px,5vw,48px);}
.v30 .sec{padding-block:clamp(72px,11vw,132px);}
.v30 .rule{border:0;border-top:1px solid var(--line);margin:0;}
.v30 .lead{color:var(--muted);font-size:clamp(1.02rem,1.6vw,1.22rem);line-height:1.5;max-width:60ch;text-wrap:pretty;}
.v30 h2{font-size:clamp(1.9rem,4.4vw,3.1rem);}

/* CTA pills */
.v30 .pills{display:flex;flex-wrap:wrap;gap:12px;align-items:center;}
.v30 .pill{display:inline-flex;align-items:center;gap:9px;height:52px;padding:0 26px;border-radius:999px;
  font-weight:600;font-size:1.02rem;transition:transform .5s cubic-bezier(.16,1,.3,1),box-shadow .5s cubic-bezier(.16,1,.3,1),background .3s;}
.v30 .pill-1{background:var(--accent-ink);color:#fff;box-shadow:0 8px 22px -10px rgba(228,87,46,.6);}
.v30 .pill-1:hover{transform:translateY(-2px);box-shadow:0 16px 34px -12px rgba(228,87,46,.7);}
.v30 .pill-1 svg{transition:transform .5s cubic-bezier(.16,1,.3,1);}
.v30 .pill-1:hover svg{transform:translateX(4px);}
.v30 .pill-2{background:transparent;color:var(--ink);border:1px solid var(--line);}
.v30 .pill-2:hover{border-color:var(--ink);transform:translateY(-2px);}
.v30 .anon{display:inline-flex;align-items:center;gap:6px;font-weight:600;color:var(--accent-ink);
  font-size:.98rem;border-bottom:1px solid transparent;transition:border-color .3s;}
.v30 .anon:hover{border-color:var(--accent-ink);}

/* top nav */
.v30 .nav{position:sticky;top:0;z-index:40;backdrop-filter:saturate(1.2) blur(8px);
  background:color-mix(in srgb,var(--bg) 82%,transparent);border-bottom:1px solid transparent;transition:border-color .3s;}
.v30 .nav.on{border-color:var(--line);}
.v30 .nav .wrap{display:flex;align-items:center;justify-content:space-between;height:66px;}
.v30 .mark{font-family:var(--font-display),serif;font-weight:700;font-size:1.15rem;letter-spacing:-0.02em;display:inline-flex;align-items:center;gap:9px;}
.v30 .markdot{width:11px;height:11px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px rgba(228,87,46,.14);}
.v30 .navlink{font-weight:600;font-size:.96rem;color:var(--muted);}
.v30 .navlink:hover{color:var(--ink);}

/* hero */
.v30 .hero{position:relative;padding-top:clamp(36px,5vw,56px);}
.v30 .hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(28px,4vw,56px);align-items:center;}
.v30 .h1{font-size:clamp(2.7rem,6vw,4.9rem);line-height:.98;}
.v30 .h1 .accent{color:var(--accent);}
.v30 .hero-sub{margin-top:22px;color:var(--muted);font-size:clamp(1.08rem,1.9vw,1.35rem);line-height:1.42;max-width:34ch;text-wrap:pretty;}
.v30 .chips{display:flex;flex-wrap:wrap;gap:9px;margin-top:26px;}
.v30 .chip{font-size:.86rem;font-weight:600;color:var(--muted);background:var(--surface);
  border:1px solid var(--line);border-radius:999px;padding:7px 14px;}
.v30 .heroctas{margin-top:30px;}
.v30 .heroanonrow{margin-top:16px;}
.v30 .statline{margin-top:34px;display:flex;align-items:baseline;gap:14px;padding-top:22px;border-top:1px solid var(--line);}
.v30 .statbig{font-family:var(--font-display),serif;font-weight:600;font-size:clamp(2.6rem,4.6vw,3.7rem);color:var(--accent);line-height:1;}
.v30 .statlbl{color:var(--muted);font-size:.98rem;max-width:22ch;line-height:1.3;}

/* question card (hero + sim share .qcard base) */
.v30 .qwrap{position:relative;}
.v30 .qsliver{position:absolute;top:-6%;right:-46%;width:56%;height:112%;opacity:.75;pointer-events:none;
  -webkit-mask-image:linear-gradient(to right,#000,transparent 82%);mask-image:linear-gradient(to right,#000,transparent 82%);}
@media(max-width:960px){.v30 .qsliver{display:none;}}
.v30 .qcard{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:26px;
  padding:clamp(20px,2.6vw,30px);box-shadow:0 30px 70px -40px rgba(20,40,42,.42),0 2px 6px -3px rgba(20,40,42,.1);}
.v30 .qtop{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;}
.v30 .qtopic{font-size:.8rem;font-weight:700;letter-spacing:.02em;color:var(--accent-ink);text-transform:uppercase;}
.v30 .qtext{font-family:var(--font-display),serif;font-weight:600;font-size:clamp(1.18rem,2vw,1.5rem);line-height:1.18;}
.v30 .opts{display:flex;flex-direction:column;gap:9px;margin-top:18px;}
.v30 .opt{display:flex;align-items:center;gap:12px;text-align:left;width:100%;padding:14px 16px;border-radius:15px;
  border:1px solid var(--line);background:#fff;color:var(--ink);font-size:.98rem;font-weight:500;cursor:pointer;
  transition:border-color .25s,background .25s,transform .25s;line-height:1.25;}
.v30 .opt:hover:not(:disabled){border-color:var(--ink);}
.v30 .opt:disabled{cursor:default;}
.v30 .opt .dot{flex:0 0 auto;width:22px;height:22px;border-radius:50%;border:1.5px solid var(--line);
  display:grid;place-items:center;transition:all .25s;}
.v30 .opt.correct{border-color:var(--ok);background:var(--ok-bg);}
.v30 .opt.correct .dot{border-color:var(--ok);background:var(--ok);color:#fff;}
.v30 .opt.wrong{border-color:var(--accent);background:#fdeee9;}
.v30 .opt.wrong .dot{border-color:var(--accent);background:var(--accent);color:#fff;}
.v30 .opt.dim{opacity:.55;}
.v30 .qfb{margin-top:16px;font-size:.94rem;line-height:1.45;color:var(--ink);
  background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:13px 15px;}
.v30 .qfb.ok{border-color:var(--ok-line);background:var(--ok-bg);}
.v30 .qfb.no{border-color:#f3cdbf;background:#fdeee9;}

/* real question image in the hero card */
.v30 .qimg{width:100%;height:auto;display:block;border-radius:14px;border:1px solid var(--line);margin:2px 0 14px;}

/* proof band — unretouched product screenshot in the sim frame */
.v30 .proof-shot{max-width:880px;margin:44px auto 0;}
.v30 .proof-shot img{display:block;width:100%;height:auto;}
.v30 .proof-note{margin-top:14px;text-align:center;font-size:.88rem;color:var(--muted);}

/* container-grammar breaks: the map bleeds to the viewport edge; the pulse runs full-bleed */
@media(min-width:1240px){
  .v30 .atlas-panel{margin-left:calc((1120px - 100vw)/2 - 48px);border-top-left-radius:0;border-bottom-left-radius:0;}
  .v30 .atlas-panel .atlas-inner{padding-left:clamp(34px,4vw,64px);}
}
.v30 .pulse{width:100vw;position:relative;left:50%;transform:translateX(-50%);}

/* mini meter */
.v30 .meter{margin-top:18px;display:flex;align-items:center;gap:14px;}
.v30 .meter-track{flex:1;height:9px;border-radius:999px;background:var(--h0);overflow:hidden;}
.v30 .meter-fill{height:100%;width:100%;border-radius:999px;transform:scaleX(0);transform-origin:left;
  background:linear-gradient(90deg,#B9D4D2,#2E6F6E);transition:transform 1.1s cubic-bezier(.16,1,.3,1);}
.v30 .meter-val{font-family:var(--font-display),serif;font-weight:600;font-size:1.35rem;color:var(--ink);min-width:56px;text-align:right;}
.v30 .meter-lbl{font-size:.78rem;color:var(--muted);font-weight:600;}
.v30 .meterhint{margin-top:9px;font-size:.82rem;color:var(--muted);line-height:1.35;}

/* diagnostic pulse line — hero signature: anxious spikes settle into steady rhythm */
.v30 .pulse{display:block;height:48px;margin-top:clamp(30px,4.4vw,52px);overflow:visible;}

/* atlas crosshair — instrument hover (pointer devices only, decorative) */
.v30 .ch{position:absolute;pointer-events:none;opacity:0;z-index:4;
  transition:opacity .25s,transform .16s cubic-bezier(.16,1,.3,1);}
.v30 .chx{top:0;bottom:0;left:0;width:1px;background:rgba(228,87,46,.35);transform:translateX(var(--chx,0));}
.v30 .chy{left:0;right:0;top:0;height:1px;background:rgba(228,87,46,.35);transform:translateY(var(--chy,0));}
.v30 .atlas-panel.ch-on .ch{opacity:1;}
@media(hover:none){.v30 .ch{display:none;}}

/* footer mini-map signature */
.v30 .footmap{width:150px;height:auto;display:block;margin-top:20px;}

/* atlas */
.v30 .atlas-panel{background:var(--surface);border:1px solid var(--line);border-radius:26px;overflow:hidden;position:relative;
  box-shadow:0 30px 70px -46px rgba(20,40,42,.4);}
.v30 .atlas-grid-bg{position:absolute;inset:0;opacity:.5;pointer-events:none;
  background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);
  background-size:34px 34px;-webkit-mask-image:radial-gradient(120% 90% at 50% 0,#000,transparent 78%);mask-image:radial-gradient(120% 90% at 50% 0,#000,transparent 78%);}
.v30 .atlas-inner{position:relative;padding:clamp(20px,3vw,34px);}
.v30 .atlas-lay{display:grid;grid-template-columns:1.55fr .9fr;gap:clamp(24px,3.4vw,48px);align-items:start;}
@media(max-width:900px){.v30 .atlas-lay{grid-template-columns:1fr;}}
.v30 .scan{position:absolute;top:0;bottom:0;left:0;width:3px;border-radius:2px;opacity:0;pointer-events:none;z-index:8;
  background:linear-gradient(180deg,transparent,var(--accent) 30%,var(--accent) 70%,transparent);
  box-shadow:0 0 18px 3px rgba(228,87,46,.4);}
.v30 .tiles{display:grid;grid-template-columns:repeat(13,1fr);gap:8px;}
@media(max-width:760px){.v30 .tiles{grid-template-columns:repeat(9,1fr);}}
.v30 .tile{aspect-ratio:1;border-radius:7px;background:var(--h0);border:1px solid rgba(30,52,54,.05);
  position:relative;cursor:default;transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s,filter .3s;}
.v30 .tile.hot{cursor:pointer;}
.v30 .tile.hot::before{content:"";position:absolute;inset:-9px;} /* ~45px hit area on mobile (tiles render ~27px) */
.v30 .tile.hot:hover{transform:scale(1.14);z-index:5;box-shadow:0 8px 20px -6px rgba(228,87,46,.5);}
.v30 .tile.warm{background:var(--h1);}
.v30 .tile.max{background:var(--h2);box-shadow:0 0 0 1px rgba(228,87,46,.3);}
.v30 .tile .tt{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%) translateY(4px);
  background:var(--dark);color:#fff;font-size:.72rem;font-weight:600;white-space:nowrap;padding:6px 10px;border-radius:8px;
  opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;z-index:20;box-shadow:0 8px 20px -8px rgba(0,0,0,.5);}
.v30 .tile:hover .tt,.v30 .tile.open .tt,.v30 .tile.hot:focus-visible .tt{opacity:1;transform:translateX(-50%) translateY(0);}
.v30 .tiles .tile:nth-child(-n+13) .tt{bottom:auto;top:calc(100% + 8px);}
@media(max-width:760px){.v30 .tiles .tile:nth-child(n+10):nth-child(-n+13) .tt{top:auto;bottom:calc(100% + 8px);}}
.v30 .tile.hot:focus-visible{outline:2px solid var(--accent);outline-offset:2px;z-index:6;}
.v30 .tile.open{z-index:6;}
.v30 .atlas-side{display:flex;flex-direction:column;gap:14px;}
.v30 .hotlist{display:flex;flex-direction:column;gap:2px;}
.v30 .hotrow{display:flex;align-items:center;gap:12px;padding:11px 4px;border-bottom:1px solid var(--line);}
.v30 .hotrow:last-child{border-bottom:0;}
.v30 .hotsw{width:14px;height:14px;border-radius:4px;flex:0 0 auto;background:var(--h2);box-shadow:0 0 0 3px rgba(228,87,46,.14);}
.v30 .hotname{font-weight:600;font-size:1rem;}
.v30 .ramp{margin-top:6px;}
.v30 .ramp-bar{height:12px;border-radius:999px;background:linear-gradient(90deg,var(--h0),var(--h1) 55%,var(--h2));}
.v30 .ramp-lbls{display:flex;justify-content:space-between;margin-top:7px;font-size:.76rem;color:var(--muted);font-weight:600;}
.v30 .src{font-size:.82rem;color:var(--muted);margin-top:14px;display:inline-flex;align-items:center;gap:7px;}
.v30 .src::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--accent);}

.v30 .split{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,4vw,56px);align-items:center;}
@media(max-width:900px){.v30 .split,.v30 .hero-grid{grid-template-columns:1fr;}}

/* dial */
.v30 .dial-panel{background:var(--surface);border:1px solid var(--line);border-radius:26px;padding:clamp(24px,3vw,38px);
  box-shadow:0 30px 70px -46px rgba(20,40,42,.4);}
.v30 .dial-top{display:flex;flex-direction:column;align-items:center;text-align:center;}
.v30 .dial-svg{width:min(300px,78vw);height:auto;}
.v30 .dial-center{font-family:var(--font-display),serif;font-weight:600;}
.v30 .dial-cap{margin-top:2px;font-weight:600;font-size:1rem;color:var(--accent-ink);}
.v30 .subbars{margin-top:26px;display:flex;flex-direction:column;gap:13px;}
.v30 .subbars h4{font-size:.82rem;font-weight:700;letter-spacing:.02em;text-transform:uppercase;color:var(--muted);margin-bottom:2px;}
.v30 .sbrow{display:grid;grid-template-columns:1fr auto;gap:6px 12px;align-items:center;}
.v30 .sbname{font-size:.92rem;font-weight:500;}
.v30 .sbval{font-variant-numeric:tabular-nums;font-weight:600;font-size:.92rem;color:var(--muted);}
.v30 .sbtrack{grid-column:1/-1;height:7px;border-radius:999px;background:var(--h0);overflow:hidden;}
.v30 .sbfill{height:100%;border-radius:999px;}
.v30 .moat{margin-top:26px;padding-top:20px;border-top:1px solid var(--line);
  font-family:var(--font-display),serif;font-weight:500;font-size:clamp(1.05rem,1.7vw,1.28rem);line-height:1.32;}

/* mechanism */
.v30 .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(16px,2.4vw,28px);margin-top:44px;}
@media(max-width:820px){.v30 .steps{grid-template-columns:1fr;}}
.v30 .step{position:relative;padding-top:26px;}
.v30 .step .n{font-family:var(--font-display),serif;font-weight:600;font-size:2.6rem;color:var(--accent);line-height:1;opacity:.9;}
.v30 .step h3{font-size:1.24rem;margin-top:14px;line-height:1.15;}
.v30 .step p{color:var(--muted);margin-top:9px;font-size:.98rem;line-height:1.5;}
.v30 .step::before{content:"";position:absolute;top:0;left:0;width:44px;height:2px;background:var(--accent);}

/* plan */
.v30 .plan-panel{background:var(--surface);border:1px solid var(--line);border-radius:26px;padding:clamp(24px,3.2vw,40px);
  box-shadow:0 30px 70px -46px rgba(20,40,42,.4);}
.v30 .plan-in{display:flex;flex-wrap:wrap;align-items:flex-end;gap:18px;}
.v30 .plan-field{display:flex;flex-direction:column;gap:8px;}
.v30 .plan-field label{font-size:.86rem;font-weight:600;color:var(--muted);}
.v30 .date-in{height:54px;border:1px solid var(--line);border-radius:14px;background:#fff;color:var(--ink);
  padding:0 16px;font-size:1.02rem;font-weight:600;font-family:inherit;min-width:200px;}
.v30 .date-in:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:var(--accent);}
.v30 .plan-preview{margin-top:26px;padding-top:24px;border-top:1px solid var(--line);}
.v30 .pp-lead{font-size:.86rem;font-weight:700;text-transform:uppercase;letter-spacing:.02em;color:var(--muted);display:flex;align-items:center;gap:10px;}
.v30 .badge-int{background:var(--accent-ink);color:#fff;border-radius:999px;padding:3px 10px;font-size:.72rem;font-weight:700;letter-spacing:0;text-transform:none;}
.v30 .pp-nums{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 22px;margin-top:14px;}
.v30 .pp-n{font-family:var(--font-display),serif;font-weight:600;font-size:clamp(2.2rem,5vw,3.4rem);line-height:1;}
.v30 .pp-n small{font-size:.9rem;font-weight:600;color:var(--muted);margin-left:8px;font-family:var(--font-body),sans-serif;}
.v30 .pp-x{font-family:var(--font-display),serif;font-size:1.6rem;color:var(--muted);align-self:center;}
.v30 .pp-payoff{margin-top:16px;color:var(--muted);font-size:1rem;line-height:1.45;max-width:44ch;}

/* simulator */
.v30 .sim-panel{background:var(--surface);border:1px solid var(--line);border-radius:26px;overflow:hidden;
  box-shadow:0 30px 70px -46px rgba(20,40,42,.4);}
.v30 .sim-chrome{display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:14px 20px;background:var(--dark);color:#dfeceb;}
.v30 .sim-chrome .dots{display:flex;gap:6px;}
.v30 .sim-chrome .dots i{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.22);}
.v30 .sim-meta{font-size:.82rem;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:.02em;}
.v30 .sim-body{padding:clamp(20px,2.6vw,30px);}
.v30 .sim-sign{display:grid;place-items:center;padding:8px 0 20px;}
.v30 .simchips{display:flex;flex-wrap:wrap;gap:12px;}
.v30 .simchip{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px 20px;text-align:center;min-width:96px;}
.v30 .simchip b{font-family:var(--font-display),serif;font-weight:600;font-size:2rem;color:var(--ink);display:block;line-height:1;}
.v30 .simchip span{font-size:.86rem;color:var(--muted);font-weight:600;margin-top:6px;display:block;}
.v30 .simfree{display:inline-flex;align-items:center;gap:8px;margin-top:22px;font-family:var(--font-display),serif;
  font-weight:600;font-size:clamp(1.3rem,2.4vw,1.7rem);color:var(--accent);}

/* loss band */
.v30 .loss{background:var(--dark);color:#eaf2f1;}
.v30 .loss .wrap{padding-block:clamp(72px,10vw,120px);}
.v30 .loss-fig{font-family:var(--font-display),serif;font-weight:600;font-size:clamp(2.2rem,6vw,4.5rem);line-height:1.04;letter-spacing:-0.02em;max-width:20ch;}
.v30 .loss-fig .accent{color:var(--accent);}
.v30 .loss-calm{margin-top:22px;color:#a9c2c0;font-size:clamp(1.02rem,1.7vw,1.2rem);line-height:1.5;max-width:52ch;}
.v30 .loss .pill-1{margin-top:30px;}

/* pricing */
.v30 .price-head{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px 22px;}
.v30 .price-big{font-family:var(--font-display),serif;font-weight:600;font-size:clamp(3rem,8vw,5rem);line-height:.9;color:var(--ink);}
.v30 .price-once{font-size:1.1rem;font-weight:600;color:var(--muted);}
.v30 .price-cols{display:grid;grid-template-columns:1.15fr .85fr;gap:20px;margin-top:34px;}
@media(max-width:820px){.v30 .price-cols{grid-template-columns:1fr;}}
.v30 .pcol{border:1px solid var(--line);border-radius:22px;padding:clamp(22px,2.8vw,32px);background:var(--surface);}
.v30 .pcol.free{background:#fff;border-color:#cfe0df;}
.v30 .pcol h3{font-size:1.3rem;display:flex;align-items:center;gap:10px;}
.v30 .pcol .free-tag{font-family:var(--font-body),sans-serif;font-weight:700;font-size:.74rem;background:var(--ok);color:#fff;padding:3px 9px;border-radius:999px;letter-spacing:.02em;}
.v30 .plist{list-style:none;padding:0;margin:18px 0 0;display:flex;flex-direction:column;gap:12px;}
.v30 .plist li{display:flex;align-items:flex-start;gap:11px;font-size:1rem;line-height:1.35;}
.v30 .plist li svg{flex:0 0 auto;margin-top:2px;}
.v30 .pcol.free .plist li svg{color:var(--ok);}
.v30 .pcol.paid .plist li svg{color:var(--accent);}
.v30 .neg{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px;}
.v30 .neg span{font-size:.86rem;font-weight:600;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:6px 13px;}
.v30 .failsafe{margin-top:16px;font-size:.92rem;color:var(--muted);line-height:1.45;background:var(--bg);border-radius:12px;padding:12px 14px;}
.v30 .pricemeta{margin-top:26px;display:flex;flex-direction:column;gap:12px;}
.v30 .cheaper{font-family:var(--font-display),serif;font-weight:500;font-size:clamp(1.1rem,1.9vw,1.4rem);}
.v30 .trust{display:flex;flex-wrap:wrap;gap:10px 20px;align-items:center;padding-top:18px;border-top:1px solid var(--line);}
.v30 .trust span{display:inline-flex;align-items:center;gap:8px;font-size:.94rem;font-weight:600;color:var(--muted);}
.v30 .trust span svg{color:var(--ok);}
.v30 .price-ctas{margin-top:30px;}

/* base + reserved */
.v30 .base-row{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:stretch;}
@media(max-width:820px){.v30 .base-row{grid-template-columns:1fr;}}
.v30 .basecard{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:clamp(24px,3vw,34px);display:flex;flex-direction:column;justify-content:center;}
.v30 .basestat{font-family:var(--font-display),serif;font-weight:600;font-size:clamp(1.3rem,2.4vw,1.85rem);line-height:1.16;}
.v30 .fresh{margin-top:16px;display:inline-flex;align-items:center;gap:9px;align-self:flex-start;
  font-size:.88rem;font-weight:700;color:var(--ok);background:var(--ok-bg);border:1px solid var(--ok-line);border-radius:999px;padding:7px 14px;}
.v30 .fresh i{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 4px rgba(47,125,91,.16);}
.v30 .reserved{background:var(--bg);border:1px dashed var(--line);border-radius:22px;padding:clamp(24px,3vw,34px);}
.v30 .reserved h3{font-size:1.15rem;color:var(--muted);}
.v30 .reserved .empty{margin-top:16px;height:82px;border-radius:14px;border:1px dashed var(--line);
  display:grid;place-items:center;color:var(--muted);font-size:.86rem;font-weight:600;
  background:repeating-linear-gradient(45deg,transparent,transparent 9px,rgba(82,105,108,.05) 9px,rgba(82,105,108,.05) 18px);}
.v30 .reserved p{margin-top:16px;color:var(--muted);font-size:.94rem;line-height:1.5;}

/* faq */
.v30 .faqlist{margin-top:36px;border-top:1px solid var(--line);}
.v30 .faqitem{border-bottom:1px solid var(--line);}
.v30 .faqq{width:100%;display:flex;align-items:center;justify-content:space-between;gap:20px;
  padding:22px 4px;background:none;border:0;cursor:pointer;text-align:left;color:var(--ink);
  font-family:var(--font-display),serif;font-weight:600;font-size:clamp(1.1rem,1.9vw,1.35rem);line-height:1.2;}
.v30 .faqq svg{flex:0 0 auto;color:var(--muted);transition:transform .35s cubic-bezier(.16,1,.3,1);}
.v30 .faqitem.open .faqq svg{transform:rotate(180deg);color:var(--accent);}
.v30 .faqa{display:grid;grid-template-rows:0fr;transition:grid-template-rows .4s cubic-bezier(.16,1,.3,1);}
.v30 .faqa-clip{min-height:0;overflow:hidden;}
.v30 .faqa-in{padding:0 4px 24px;color:var(--muted);font-size:1.02rem;line-height:1.6;max-width:68ch;}

/* final + launcher — the page's one drenched moment: the diagnosis red owns the close */
.v30 .final{text-align:center;background:var(--accent-ink);color:#fff;}
.v30 .final h2{font-size:clamp(2.3rem,6vw,4.3rem);max-width:16ch;margin-inline:auto;color:#fff;}
.v30 .final .lead{margin:20px auto 0;text-align:center;color:rgba(255,255,255,.95);}
.v30 .final .pills{justify-content:center;margin-top:32px;}
.v30 .final .pill-1{background:#fff;color:var(--accent-ink);box-shadow:0 10px 26px -12px rgba(20,40,42,.55);}
.v30 .final .pill-1:hover{box-shadow:0 18px 38px -14px rgba(20,40,42,.6);}
.v30 .final .pill-2{border-color:rgba(255,255,255,.55);color:#fff;}
.v30 .final .pill-2:hover{border-color:#fff;}
.v30 .final .anon{color:#fff;}
.v30 .final .anon:hover{border-color:#fff;}
.v30 .final .heroanonrow{text-align:center;}
.v30 .launcher{margin-top:44px;max-width:520px;margin-inline:auto;display:flex;flex-direction:column;gap:11px;text-align:left;}
.v30 .lrow{display:flex;align-items:center;gap:16px;padding:18px 20px;border-radius:18px;background:var(--surface);
  border:1px solid var(--line);transition:border-color .3s,transform .3s;}
.v30 .lrow:hover{border-color:var(--ink);transform:translateY(-2px);}
.v30 .final .lrow{background:#fff;border-color:transparent;color:var(--ink);}
.v30 .final .lrow:hover{transform:translateY(-2px);box-shadow:0 14px 30px -16px rgba(20,40,42,.5);}
.v30 .lrow .li{width:40px;height:40px;border-radius:11px;flex:0 0 auto;display:grid;place-items:center;
  background:var(--bg);color:var(--accent);}
.v30 .lrow .lt{flex:1;}
.v30 .lrow .lt b{font-family:var(--font-display),serif;font-weight:600;font-size:1.1rem;display:block;}
.v30 .lrow .lt span{font-size:.88rem;color:var(--muted);}
.v30 .lrow .la{color:var(--muted);}

/* footer */
.v30 .foot{background:var(--dark);color:#c4d6d4;position:relative;overflow:hidden;}
.v30 .foot-grid-bg{position:absolute;inset:0;opacity:.5;
  background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);
  background-size:40px 40px;-webkit-mask-image:radial-gradient(120% 120% at 0 100%,#000,transparent 72%);mask-image:radial-gradient(120% 120% at 0 100%,#000,transparent 72%);}
.v30 .foot .wrap{position:relative;padding-block:clamp(56px,8vw,88px);}
.v30 .foot-word{font-family:var(--font-display),serif;font-weight:700;letter-spacing:-0.03em;color:#fff;
  font-size:clamp(2.6rem,9vw,6rem);line-height:.9;}
.v30 .foot-word .dot{color:var(--accent);}
.v30 .foot-tag{margin-top:12px;color:#8fabaa;font-size:1.02rem;}
.v30 .foot-cols{display:flex;flex-wrap:wrap;gap:44px;margin-top:44px;}
.v30 .foot-col h4{color:#fff;font-family:var(--font-body),sans-serif;font-weight:700;font-size:.82rem;text-transform:uppercase;letter-spacing:.06em;}
.v30 .foot-col ul{list-style:none;padding:0;margin:14px 0 0;display:flex;flex-direction:column;gap:10px;}
.v30 .foot-col a{color:#a9c2c0;font-size:.96rem;}
.v30 .foot-col a:hover{color:#fff;}
.v30 .foot-disc{margin-top:44px;padding-top:24px;border-top:1px solid rgba(255,255,255,.1);
  color:#7e9b9a;font-size:.86rem;line-height:1.6;max-width:70ch;}
.v30 .foot-copy{margin-top:16px;color:#7e9b9a;font-size:.84rem;}

@media (prefers-reduced-motion: reduce){
  .v30 *{scroll-behavior:auto!important;}
  .v30 .meter-fill{transition:none;}
  .v30 .faqa{transition:none;}
}
`;

/* ── SVG gauge helpers ─────────────────────────────────────────────────────*/
function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = polar(cx, cy, r, a0);
  const p1 = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}
const A0 = -135;
const SWEEP = 270;

/* heat color for sub-bars (cold→hot) */
function heat(v: number) {
  // 0..100 → #DAE4E4 (cold) → #EBC0AC (mid) → #E4572E (hot)
  const stops: [number, [number, number, number]][] = [
    [0, [218, 228, 228]],
    [55, [235, 192, 172]],
    [100, [228, 87, 46]],
  ];
  let a = stops[0], b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (v >= stops[i][0] && v <= stops[i + 1][0]) { a = stops[i]; b = stops[i + 1]; break; }
  }
  const t = (v - a[0]) / (b[0] - a[0] || 1);
  const c = a[1].map((ch, i) => Math.round(ch + (b[1][i] - ch) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/* Ukrainian cardinal agreement: 1→one, 2–4→few, 5–20/0→many (11–14 always many) */
function pluralUk(n: number, f: { one: string; few: string; many: string }) {
  const m10 = n % 10, m100 = n % 100;
  if (m100 >= 11 && m100 <= 14) return f.many;
  if (m10 === 1) return f.one;
  if (m10 >= 2 && m10 <= 4) return f.few;
  return f.many;
}

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── CTA pill pair (identical everywhere) ──────────────────────────────────*/
function Pills() {
  return (
    <div className="pills">
      <Link href={CTA.primary.href} className="pill pill-1" aria-label={CTA.primary.aria}>
        {CTA.primary.label} <ArrowRight size={18} strokeWidth={2.4} />
      </Link>
      <Link href={CTA.secondary.href} className="pill pill-2" aria-label={CTA.secondary.aria}>
        {CTA.secondary.label}
      </Link>
    </div>
  );
}
function AnonLink() {
  return (
    <div className="heroanonrow">
      <Link href={CTA.anon.href} className="anon" aria-label={CTA.anon.aria}>
        {CTA.anon.label} <ArrowUpRight size={16} strokeWidth={2.4} />
      </Link>
    </div>
  );
}

/* ── Diagnostic pulse line (hero signature) ────────────────────────────────
   One line tells the product story: jagged exam-anxiety spikes on the left
   settle into a calm, steady readiness rhythm on the right. Draw-on once at
   load; base state fully visible (reduced-motion / no-JS safe). */
function PulseLine() {
  const ref = useRef<SVGPathElement>(null);
  const gradId = useId().replace(/:/g, "");
  useEffect(() => {
    if (prefersReduced()) return;
    const el = ref.current;
    if (!el) return;
    const len = el.getTotalLength();
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { strokeDasharray: len, strokeDashoffset: len },
        { strokeDashoffset: 0, duration: 2.4, ease: "power2.out", delay: 0.5 },
      );
    });
    return () => ctx.revert();
  }, []);
  return (
    <svg className="pulse" viewBox="0 0 1120 48" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`p${gradId}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E4572E" />
          <stop offset="46%" stopColor="#B08578" />
          <stop offset="100%" stopColor="#2E6F6E" />
        </linearGradient>
      </defs>
      <path
        ref={ref}
        d="M0,24 L56,24 L68,6 L80,42 L92,10 L104,38 L116,24 L200,24 L212,12 L224,36 L236,18 L248,30 L260,24 L360,24 L372,16 L384,32 L396,24 L520,24 L532,19 L544,29 L556,24 L700,24 L710,21 L720,27 L730,24 L880,24 L888,22 L896,26 L904,24 L1120,24"
        fill="none"
        stroke={`url(#p${gradId})`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Hero live question + mini meter ───────────────────────────────────────*/
function HeroQuestion() {
  const q = COPY.hero.question;
  const [picked, setPicked] = useState<number | null>(null);
  const [meter, setMeter] = useState(0);
  const correctIdx = q.options.findIndex((o) => o.correct);
  const answered = picked !== null;
  const isRight = picked === correctIdx;

  const pick = (i: number) => {
    if (answered) return;
    setPicked(i);
    setMeter(q.options[i].correct ? 20 : 9);
  };

  return (
    <div className="qcard" id="v30-hero-q">
      <div className="qtop">
        <span className="qtopic">{q.topic}</span>
      </div>
      {q.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="qimg" src={q.image} alt={q.imageAlt} width={448} height={336} />
      )}
      <p className="qtext">{q.text}</p>
      <div className="opts">
        {q.options.map((o, i) => {
          const cls = answered
            ? o.correct
              ? "opt correct"
              : i === picked
                ? "opt wrong"
                : "opt dim"
            : "opt";
          return (
            <button key={i} className={cls} onClick={() => pick(i)} disabled={answered}>
              <span className="dot">
                {answered && o.correct && <Check size={14} strokeWidth={3} />}
                {answered && i === picked && !o.correct && <X size={14} strokeWidth={3} />}
              </span>
              {o.text}
            </button>
          );
        })}
      </div>
      <div aria-live="polite">
        {answered && (
          <div className={`qfb ${isRight ? "ok" : "no"}`}>{isRight ? q.right : q.wrong}</div>
        )}
      </div>
      <div className="meter">
        <span className="meter-lbl">{COPY.hero.meterLabel}</span>
        <div className="meter-track">
          <div className="meter-fill" style={{ transform: `scaleX(${meter / 100})` }} />
        </div>
        <span className="meter-val num">{meter}%</span>
      </div>
      <p className="meterhint">{COPY.hero.meterHint}</p>
    </div>
  );
}

/* ── Atlas sliver (decorative preview of the next section) ──────────────────*/
function AtlasSliver() {
  const tiles = Array.from({ length: 130 });
  const hotSet = new Set([28, 41, 55, 68, 82, 96, 110]);
  return (
    <svg className="qsliver" viewBox="0 0 200 400" aria-hidden="true">
      {tiles.map((_, i) => {
        const col = i % 10;
        const row = Math.floor(i / 10);
        const hot = hotSet.has(i);
        return (
          <rect
            key={i}
            x={col * 20 + 2}
            y={row * 30 + 2}
            width={16}
            height={26}
            rx={3}
            fill={hot ? "#E4572E" : "#DAE4E4"}
            opacity={hot ? 0.9 : 0.7}
          />
        );
      })}
    </svg>
  );
}

/* ── КАРТА — topic atlas ───────────────────────────────────────────────────*/
function Atlas({ topics }: { topics: string[] }) {
  const hot = COPY.atlas.hot;
  const [open, setOpen] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // instrument crosshair: hairlines snap to the hovered tile's center
  const onTileOver = useCallback((e: React.MouseEvent) => {
    const t = (e.target as HTMLElement).closest(".tile");
    const panel = panelRef.current;
    if (!t || !panel) return;
    const pr = panel.getBoundingClientRect();
    const tr = t.getBoundingClientRect();
    panel.style.setProperty("--chx", `${tr.left - pr.left + tr.width / 2}px`);
    panel.style.setProperty("--chy", `${tr.top - pr.top + tr.height / 2}px`);
    panel.classList.add("ch-on");
  }, []);
  const onTilesLeave = useCallback(() => {
    panelRef.current?.classList.remove("ch-on");
  }, []);
  // 65 tiles: 5 hot at stable positions genuinely SCATTERED across the grid
  // (cols 2/11/7/5/9, one per row — the old set clustered in cols 5–7 and read
  // as a stripe). All five at maximum heat: MVS names the top-failed topics
  // without ranking within the set, so equal vermillion is the honest render.
  const hotPos = [2, 24, 33, 44, 61];
  const hotHeat = [100, 100, 100, 100, 100]; // aligned to COPY.atlas.hot order
  const tiles = useMemo(() => {
    let hi = 0;
    return Array.from({ length: 65 }, (_, i) => {
      const hotIdx = hotPos.indexOf(i);
      if (hotIdx >= 0) {
        return { hot: true, hotIdx, max: hotHeat[hotIdx] === 100, label: hot[hotIdx] };
      }
      return { hot: false, hotIdx: -1, max: false, label: topics[hi++ % topics.length] ?? "Тема" };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics]);

  return (
    <div className="atlas-lay">
      <div className="atlas-panel" data-atlas ref={panelRef}>
        <div className="atlas-grid-bg" />
        <span className="scan" data-scan aria-hidden="true" />
        <span className="ch chx" aria-hidden="true" />
        <span className="ch chy" aria-hidden="true" />
        <div className="atlas-inner">
          <div className="tiles" onMouseOver={onTileOver} onMouseLeave={onTilesLeave}>
            {tiles.map((t, i) => (
              <div
                key={i}
                className={`tile${t.hot ? " hot" : ""}${t.max ? " max" : ""}${open === i ? " open" : ""}`}
                style={t.hot ? { background: heat(hotHeat[t.hotIdx]) } : undefined}
                data-hot={t.hot ? "1" : "0"}
                tabIndex={t.hot ? 0 : -1}
                role={t.hot ? "button" : undefined}
                aria-label={t.hot ? t.label : undefined}
                aria-pressed={t.hot ? open === i : undefined}
                onClick={t.hot ? () => setOpen(open === i ? null : i) : undefined}
                onKeyDown={
                  t.hot
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setOpen(open === i ? null : i);
                        }
                      }
                    : undefined
                }
              >
                <span className="tt">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="atlas-side">
        <p className="lead" style={{ marginBottom: 4 }}>{COPY.atlas.lead}</p>
        <div className="hotlist">
          {hot.map((name, i) => (
            <div className="hotrow" key={name}>
              <span className="hotsw" style={{ background: heat(hotHeat[i]) }} />
              <span className="hotname">{name}</span>
            </div>
          ))}
        </div>
        <div className="ramp">
          <div className="ramp-bar" />
          <div className="ramp-lbls">
            <span>{COPY.atlas.rampLabels.cold}</span>
            <span>{COPY.atlas.rampLabels.hot}</span>
          </div>
        </div>
        <span className="src">{COPY.atlas.source}</span>
      </div>
    </div>
  );
}

/* ── Readiness dial (visibly decays) ───────────────────────────────────────*/
function ReadinessDial() {
  const svgRef = useRef<SVGSVGElement>(null);
  const numRef = useRef<SVGTSpanElement>(null);
  const valRef = useRef<SVGPathElement>(null);
  const gradId = useId().replace(/:/g, "");
  const FINAL = 73;
  const r = 82, cx = 105, cy = 105;
  const trackD = arc(cx, cy, r, A0, A0 + SWEEP);

  const setDial = useCallback((v: number) => {
    if (numRef.current) numRef.current.textContent = String(Math.round(v));
    if (valRef.current) valRef.current.setAttribute("d", arc(cx, cy, r, A0, A0 + (SWEEP * v) / 100));
  }, []);

  useEffect(() => {
    setDial(FINAL);
    if (prefersReduced()) return;
    const el = svgRef.current;
    if (!el) return;
    const obj = { v: 0 };
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 78%", once: true },
        onUpdate: () => setDial(obj.v),
      });
      // tick up past target, then honestly decay back down
      tl.to(obj, { v: 79, duration: 1.15, ease: "expo.out" })
        .to(obj, { v: FINAL, duration: 1.4, ease: "expo.out" }, "+=0.35");
    }, el);
    return () => ctx.revert();
  }, [setDial]);

  return (
    <div className="dial-panel" data-dial-panel>
      <div className="dial-top">
        <svg ref={svgRef} className="dial-svg" viewBox="0 0 210 190" role="img" aria-label="Готовність до іспиту">
          <defs>
            {/* calm teal instrument arc — readiness is an instrument, not heat;
                vermillion is reserved strictly for weakness + CTA */}
            <linearGradient id={`g${gradId}`} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#B9D4D2" />
              <stop offset="55%" stopColor="#5A8F8C" />
              <stop offset="100%" stopColor="#254B4D" />
            </linearGradient>
          </defs>
          {/* instrument ticks along the 270° sweep — emphasized at the ends */}
          {Array.from({ length: 11 }, (_, t) => {
            const a = A0 + (SWEEP * t) / 10;
            const o = polar(cx, cy, 70, a);
            const inr = polar(cx, cy, t === 0 || t === 10 ? 60 : 65, a);
            return (
              <line
                key={t}
                x1={inr.x} y1={inr.y} x2={o.x} y2={o.y}
                stroke={t === 0 || t === 10 ? "#52696C" : "#DCE6E6"}
                strokeWidth={t === 0 || t === 10 ? 2 : 1.5}
                strokeLinecap="round"
              />
            );
          })}
          <path d={trackD} fill="none" stroke="#DAE4E4" strokeWidth={14} strokeLinecap="round" />
          <path ref={valRef} d={trackD} fill="none" stroke={`url(#g${gradId})`} strokeWidth={14} strokeLinecap="round" />
          <text x={105} y={112} textAnchor="middle" className="dial-center" fontSize="52" fill="#1E3436">
            <tspan ref={numRef}>{FINAL}</tspan>
            <tspan fontSize="24" fill="#52696C" dx="2">%</tspan>
          </text>
        </svg>
        <span className="dial-cap">{COPY.dial.caption}</span>
      </div>

      <div className="subbars">
        <h4>{COPY.dial.subbarsTitle}</h4>
        {COPY.dial.subbars.map((s) => (
          <div className="sbrow" key={s.topic}>
            <span className="sbname">{s.topic}</span>
            <span className="sbval num">{s.value}%</span>
            <div className="sbtrack">
              <div className="sbfill" style={{ width: `${s.value}%`, background: heat(100 - s.value) }} />
            </div>
          </div>
        ))}
      </div>
      <p className="moat">{COPY.dial.moat}</p>
    </div>
  );
}

/* ── ПЛАН — exam-date planner ──────────────────────────────────────────────*/
function DatePlanner() {
  const [date, setDate] = useState("");
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const minISO = todayISO;

  const daysRef = useRef<HTMLSpanElement>(null);
  const perDayRef = useRef<HTMLSpanElement>(null);
  const prev = useRef({ days: 0, perDay: 0 });

  const plan = useMemo(() => {
    if (!date) return null;
    const target = new Date(date + "T00:00:00");
    const now = new Date(todayISO + "T00:00:00");
    if (Number.isNaN(target.getTime()) || target.getTime() < now.getTime()) {
      return { invalid: "past" as const };
    }
    const days = Math.max(1, Math.round((target.getTime() - now.getTime()) / 86400000));
    if (days > 365) return { invalid: "overYear" as const };
    // spaced-repetition study load, weighted toward weak topics; clamped sensibly
    const perDay = Math.min(60, Math.max(12, Math.ceil(560 / days)));
    return { days, perDay, intensive: days < 7 };
  }, [date, todayISO]);
  const valid = plan && !("invalid" in plan) ? plan : null;

  // Signature beat: the plan-preview numbers TWEEN down as a date is picked.
  // Discrete swap under prefers-reduced-motion.
  useEffect(() => {
    if (!valid) return;
    const write = (d: number, p: number) => {
      if (daysRef.current) daysRef.current.textContent = String(d);
      if (perDayRef.current) perDayRef.current.textContent = String(p);
    };
    if (prefersReduced()) {
      write(valid.days, valid.perDay);
      prev.current = { days: valid.days, perDay: valid.perDay };
      return;
    }
    const obj = { d: prev.current.days, p: prev.current.perDay };
    const tw = gsap.to(obj, {
      d: valid.days, p: valid.perDay, duration: 0.7, ease: "expo.out",
      onUpdate: () => write(Math.round(obj.d), Math.round(obj.p)),
    });
    prev.current = { days: valid.days, perDay: valid.perDay };
    return () => { tw.kill(); };
  }, [valid]);

  return (
    <div className="plan-panel">
      <div className="plan-in">
        <div className="plan-field">
          <label htmlFor="v30-date">{COPY.plan.pickLabel}</label>
          <input
            id="v30-date"
            className="date-in"
            type="date"
            min={minISO}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="plan-preview" aria-live="polite">
        {valid ? (
          <>
            <div className="pp-lead">
              {COPY.plan.previewLead}
              {valid.intensive && <span className="badge-int">{COPY.plan.intensive}</span>}
            </div>
            <div className="pp-nums">
              <span className="pp-n num">
                ≈<span ref={daysRef}>{valid.days}</span>
                <small>{pluralUk(valid.days, COPY.plan.daysUnits)}</small>
              </span>
              <span className="pp-x">×</span>
              <span className="pp-n num">
                <span ref={perDayRef}>{valid.perDay}</span>
                <small>{pluralUk(valid.perDay, COPY.plan.perDayUnits)}{COPY.plan.perDaySuffix}</small>
              </span>
            </div>
            <p className="pp-payoff">
              {valid.intensive ? COPY.plan.intensiveNote : COPY.plan.payoff}
            </p>
          </>
        ) : (
          <p className="pp-payoff" style={{ marginTop: 0 }}>
            {plan && "invalid" in plan
              ? plan.invalid === "past" ? COPY.plan.pastDate : COPY.plan.overYear
              : COPY.plan.noDate}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Give-way road sign (SVG) for the simulator demo ───────────────────────*/
function GiveWaySign() {
  return (
    <svg width="132" height="120" viewBox="0 0 132 120" role="img" aria-label="Дорожній знак «Дати дорогу»">
      <polygon points="66,8 126,112 6,112" fill="#fff" stroke="#E4572E" strokeWidth="9" strokeLinejoin="round" />
      <polygon points="66,26 112,104 20,104" fill="#fff" stroke="#E4572E" strokeWidth="3" strokeLinejoin="round" opacity="0.35" />
    </svg>
  );
}

/* ── СИМУЛЯТОР — demo question in a simulator frame ────────────────────────*/
function SimDemo() {
  const d = COPY.sim.demo;
  const [picked, setPicked] = useState<number | null>(null);
  const correctIdx = d.options.findIndex((o) => o.correct);
  const answered = picked !== null;
  return (
    <div className="sim-panel">
      <div className="sim-chrome">
        <span className="dots"><i /><i /><i /></span>
        <span className="sim-meta num">Питання 7 / 20 · 18:24</span>
        <span className="sim-meta">Помилок: {answered && picked !== correctIdx ? 1 : 0} / 2</span>
      </div>
      <div className="sim-body">
        <div className="qtop"><span className="qtopic">{d.topic}</span></div>
        <div className="sim-sign"><GiveWaySign /></div>
        <p className="qtext">{d.text}</p>
        <div className="opts">
          {d.options.map((o, i) => {
            const cls = answered
              ? o.correct ? "opt correct" : i === picked ? "opt wrong" : "opt dim"
              : "opt";
            return (
              <button key={i} className={cls} onClick={() => !answered && setPicked(i)} disabled={answered}>
                <span className="dot">
                  {answered && o.correct && <Check size={14} strokeWidth={3} />}
                  {answered && i === picked && !o.correct && <X size={14} strokeWidth={3} />}
                </span>
                {o.text}
              </button>
            );
          })}
        </div>
        <span className="sr" aria-live="polite">
          {answered ? (picked === correctIdx ? "Правильно." : "Неправильно — правильну відповідь підсвічено.") : ""}
        </span>
      </div>
    </div>
  );
}

/* ── FAQ accordion ─────────────────────────────────────────────────────────*/
function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="faqlist">
      {COPY.faq.items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div className={`faqitem${isOpen ? " open" : ""}`} key={i}>
            <button
              className="faqq"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={`v30-faq-${i}`}
            >
              {it.q}
              <ChevronDown size={22} strokeWidth={2.2} />
            </button>
            <FaqPanel id={`v30-faq-${i}`} open={isOpen} text={it.a} />
          </div>
        );
      })}
    </div>
  );
}
function FaqPanel({ id, open, text }: { id: string; open: boolean; text: string }) {
  // grid-template-rows 0fr→1fr animates height without measurement or resize listeners
  return (
    <div className="faqa" id={id} style={{ gridTemplateRows: open ? "1fr" : "0fr" }} aria-hidden={!open}>
      <div className="faqa-clip">
        <div className="faqa-in">{text}</div>
      </div>
    </div>
  );
}

/* ── Section header ────────────────────────────────────────────────────────*/
function Head({ h2, lead }: { h2: string; lead?: string }) {
  return (
    <header style={{ maxWidth: "48ch" }}>
      <h2>{h2}</h2>
      {lead && <p className="lead" style={{ marginTop: 16 }}>{lead}</p>}
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function V30({ topics = FALLBACK_TOPICS }: { topics?: string[] }) {
  const root = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reduce = prefersReduced();
    const ctx = gsap.context(() => {
      // sticky nav border on scroll
      ScrollTrigger.create({
        start: "top -12",
        onUpdate: (self) => navRef.current?.classList.toggle("on", self.scroll() > 12),
      });

      if (!reduce) {
        // hero entrance (in view on load)
        gsap.from("[data-hero] > *", {
          opacity: 0, y: 22, duration: 0.9, ease: "expo.out", stagger: 0.08, delay: 0.05,
        });
        // atlas: a diagnostic SCAN sweeps the panel once; tiles ignite column by
        // column behind it, then the verified-hot topics pulse. (Base heat is
        // painted in CSS, so a headless capture is never blank — emphasis only.)
        ScrollTrigger.create({
          trigger: "[data-atlas]",
          start: "top 80%",
          once: true,
          onEnter: () => {
            const panel = document.querySelector<HTMLElement>("[data-atlas]");
            const scan = panel?.querySelector<HTMLElement>("[data-scan]");
            const tiles = gsap.utils.toArray<HTMLElement>("[data-atlas] .tile");
            if (!panel || !scan) return;
            const tl = gsap.timeline();
            tl.set(scan, { opacity: 1 })
              .fromTo(scan, { x: 0 }, { x: panel.offsetWidth - 3, duration: 1.05, ease: "power1.inOut" }, 0)
              .to(scan, { opacity: 0, duration: 0.25 }, ">-0.05")
              .from(tiles, {
                opacity: 0.15, scale: 0.78, duration: 0.4, ease: "expo.out",
                stagger: { grid: [5, 13], from: "start", axis: "x", each: 0.016 },
              }, 0.04)
              .to("[data-atlas] .tile.hot", {
                scale: 1.14, duration: 0.28, yoyo: true, repeat: 1, ease: "power2.inOut",
                stagger: 0.07, clearProps: "scale",
              }, ">-0.1");
          },
        });

        // SIGNATURE BEAT — at the «а які твої?» turn the POPULATION heat recedes
        // (desaturates) and the PERSONAL instrument (dial) rises in its place.
        ScrollTrigger.create({
          trigger: "[data-dial-sec]",
          start: "top 68%",
          onEnter: () =>
            gsap.to("[data-atlas]", { filter: "saturate(0.32) opacity(0.72)", duration: 0.8, ease: "power2.out" }),
          onLeaveBack: () =>
            gsap.to("[data-atlas]", { filter: "saturate(1) opacity(1)", duration: 0.6, ease: "power2.out" }),
        });
        gsap.from("[data-dial-panel]", {
          opacity: 0, y: 44, duration: 0.95, ease: "expo.out",
          scrollTrigger: { trigger: "[data-dial-sec]", start: "top 72%", once: true },
        });
      }
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div className="v30" ref={root}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <a className="skip" href="#v30-main">Перейти до змісту</a>

      {/* NAV */}
      <nav className="nav" ref={navRef}>
        <div className="wrap">
          <Link href="/" className="mark" aria-label={COPY.brand}>
            <span className="markdot" />
            {COPY.brand}
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <Link href="#faq" className="navlink">Питання</Link>
            <Link href="#price" className="navlink">Ціна</Link>
            <Link href={CTA.secondary.href} className="navlink">{CTA.secondary.label}</Link>
          </div>
        </div>
      </nav>

      <main id="v30-main">
      {/* HERO */}
      <section className="sec hero">
        <div className="wrap">
          <div className="hero-grid" data-hero>
            <div>
              <h1 className="h1">{HERO.headline}</h1>
              <p className="hero-sub">{HERO.subhead}</p>
              <div className="chips">
                {COPY.hero.chips.map((c) => <span className="chip" key={c}>{c}</span>)}
              </div>
              <div className="heroctas"><Pills /></div>
              <AnonLink />
              <div className="statline">
                <span className="statbig num">{COPY.hero.stat.value}</span>
                <span className="statlbl">{COPY.hero.stat.label}</span>
              </div>
            </div>
            <div className="qwrap">
              <AtlasSliver />
              <HeroQuestion />
            </div>
          </div>
          <PulseLine />
        </div>
      </section>

      <hr className="rule" />

      {/* КАРТА */}
      <section className="sec">
        <div className="wrap">
          <Head h2={COPY.atlas.h2} />
          <p className="lead" style={{ marginTop: 14, marginBottom: 34 }}>{COPY.atlas.hint}</p>
          <Atlas topics={topics} />
        </div>
      </section>

      <hr className="rule" />

      {/* А які теми — твої? */}
      <section className="sec" data-dial-sec>
        <div className="wrap">
          <div className="split">
            <div>
              <Head h2={COPY.dial.h2} lead={COPY.dial.lead} />
              <div style={{ marginTop: 28 }}>
                <Pills />
              </div>
              <div style={{ marginTop: 12 }}><AnonLink /></div>
            </div>
            <ReadinessDial />
          </div>
        </div>
      </section>

      <hr className="rule" />

      {/* МЕХАНІЗМ */}
      <section className="sec">
        <div className="wrap">
          <Head h2={COPY.mechanism.h2} lead={COPY.mechanism.lead} />
          <div className="steps">
            {COPY.mechanism.steps.map((s) => (
              <div className="step" key={s.n}>
                <div className="n num">{s.n}</div>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="rule" />

      {/* ПРУФ — справжній застосунок */}
      <section className="sec">
        <div className="wrap">
          <Head h2={COPY.proof.h2} lead={COPY.proof.lead} />
          <div className="sim-panel proof-shot">
            <div className="sim-chrome">
              <span className="dots"><i /><i /><i /></span>
              <span className="sim-meta">localhost · Drivers School</span>
              <span className="sim-meta num">1 / 20</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/lp/app-runner.png" alt={COPY.proof.alt} width={1380} height={1130} />
          </div>
          <p className="proof-note">{COPY.proof.note}</p>
        </div>
      </section>

      <hr className="rule" />

      {/* ПЛАН */}
      <section className="sec" id="plan">
        <div className="wrap">
          <div className="split">
            <div><Head h2={COPY.plan.h2} lead={COPY.plan.lead} /></div>
            <DatePlanner />
          </div>
        </div>
      </section>

      <hr className="rule" />

      {/* СИМУЛЯТОР */}
      <section className="sec">
        <div className="wrap">
          <div className="split">
            <div>
              <Head h2={COPY.sim.h2} lead={COPY.sim.lead} />
              <div className="simchips" style={{ marginTop: 28 }}>
                {COPY.sim.chips.map((c) => (
                  <div className="simchip" key={c.v}><b className="num">{c.k}</b><span>{c.v}</span></div>
                ))}
              </div>
              <p className="lead" style={{ marginTop: 20, fontSize: "1rem" }}>{COPY.sim.rule}</p>
              <div className="simfree">
                <ShieldCheck size={24} strokeWidth={2.2} />
                {COPY.sim.free}
              </div>
            </div>
            <SimDemo />
          </div>
        </div>
      </section>

      {/* ЦІНА ПОМИЛКИ — dark band */}
      <section className="loss">
        <div className="wrap">
          <p className="loss-fig">
            {COPY.loss.line1}<br />
            <span className="accent">{COPY.loss.line2}</span>
          </p>
          <p className="loss-calm">{COPY.loss.calm}</p>
          <Link href="#plan" className="pill pill-1" style={{ marginTop: 30 }} aria-label="побудувати план">
            {COPY.loss.cta} <ArrowRight size={18} strokeWidth={2.4} />
          </Link>
        </div>
      </section>

      {/* ЦІНА */}
      <section className="sec" id="price">
        <div className="wrap">
          <Head h2={COPY.price.h2} />
          <div className="price-head" style={{ marginTop: 20 }}>
            <span className="price-big num">{COPY.price.priceLine}</span>
            <span className="price-once">{COPY.price.priceNote}</span>
          </div>
          <p className="lead" style={{ marginTop: 14 }}>{COPY.price.frame} {COPY.price.calendar}</p>

          <div className="price-cols">
            <div className="pcol free">
              <h3>{COPY.price.free.title} <span className="free-tag">0 ₴</span></h3>
              <ul className="plist">
                {COPY.price.free.items.map((it) => (
                  <li key={it}><Check size={19} strokeWidth={2.6} />{it}</li>
                ))}
              </ul>
            </div>
            <div className="pcol paid">
              <h3>{COPY.price.paid.title}</h3>
              <ul className="plist">
                {COPY.price.paid.items.map((it) => (
                  <li key={it}><ArrowRight size={18} strokeWidth={2.6} />{it}</li>
                ))}
              </ul>
              <div className="neg">
                {COPY.price.negations.map((n) => <span key={n}>{n}</span>)}
              </div>
              <p className="failsafe">{COPY.price.failsafe}</p>
              <div style={{ marginTop: 16 }}>
                <Link href="#faq" className="anon">
                  {COPY.price.paid.more} <ArrowUpRight size={15} strokeWidth={2.4} />
                </Link>
              </div>
            </div>
          </div>

          <div className="pricemeta">
            <p className="cheaper">{COPY.price.cheaper}</p>
            <div className="trust">
              {COPY.price.trust.map((t) => (
                <span key={t}><Check size={16} strokeWidth={2.8} />{t}</span>
              ))}
            </div>
          </div>
          <div className="price-ctas"><Pills /></div>
          <div style={{ marginTop: 12 }}><AnonLink /></div>
        </div>
      </section>

      <hr className="rule" />

      {/* БАЗА + резервний слот */}
      <section className="sec">
        <div className="wrap">
          <Head h2={COPY.base.h2} />
          <div className="base-row" style={{ marginTop: 34 }}>
            <div className="basecard">
              <p className="basestat">{COPY.base.stat}</p>
              <span className="fresh"><i />{COPY.base.fresh}</span>
            </div>
            <div className="reserved">
              <h3>{COPY.base.reservedTitle}</h3>
              <div className="empty">Очікує на реальні дані</div>
              <p>{COPY.base.reservedBody}</p>
            </div>
          </div>
        </div>
      </section>

      <hr className="rule" />

      {/* FAQ */}
      <section className="sec" id="faq">
        <div className="wrap" style={{ maxWidth: 880 }}>
          <Head h2={COPY.faq.h2} />
          <Faq />
        </div>
      </section>

      {/* ФІНАЛ + launcher */}
      <section className="sec final">
        <div className="wrap">
          <h2>{COPY.final.h2}</h2>
          <p className="lead">{COPY.final.lead}</p>
          <Pills />
          <div style={{ marginTop: 14 }}><AnonLink /></div>
          <div className="launcher">
            {COPY.final.launcher.map((l) => (
              <Link href={l.href} className="lrow" key={l.t}>
                <span className="li"><ArrowRight size={20} strokeWidth={2.4} /></span>
                <span className="lt"><b>{l.t}</b><span>{l.d}</span></span>
                <span className="la"><ArrowUpRight size={18} strokeWidth={2.2} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      </main>

      {/* FOOTER */}
      <footer className="foot">
        <div className="foot-grid-bg" />
        <div className="wrap">
          <div className="foot-word">Drivers School<span className="dot">.</span></div>
          <p className="foot-tag">{COPY.footer.tagline}</p>
          {/* mini-map signature — the atlas echoed as a brand mark */}
          <svg className="footmap" viewBox="0 0 129 49" aria-hidden="true">
            {Array.from({ length: 65 }, (_, i) => (
              <rect
                key={i}
                x={(i % 13) * 10}
                y={Math.floor(i / 13) * 10}
                width={7}
                height={7}
                rx={1.5}
                fill={[2, 24, 33, 44, 61].includes(i) ? "#E4572E" : "rgba(255,255,255,.13)"}
              />
            ))}
          </svg>
          <div className="foot-cols">
            {COPY.footer.columns.map((col) => (
              <div className="foot-col" key={col.title}>
                <h4>{col.title}</h4>
                <ul>
                  {col.links.map((l) => (
                    <li key={l.label}><Link href={l.href}>{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="foot-disc">{COPY.footer.disclaimer}</p>
          <p className="foot-copy">{COPY.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}

/* Real ПДР topic titles — the atlas hover labels. Server could pass live rows;
   this static fallback keeps the page a self-contained public RSC island. */
const FALLBACK_TOPICS = [
  "Загальні положення", "Обов'язки і права водіїв", "Рух зі спеціальними сигналами",
  "Обов'язки і права пішоходів", "Обов'язки і права пасажирів", "Вимоги до велосипедистів",
  "Гужовий транспорт", "Регульовані перехрестя", "Попереджувальні сигнали",
  "Початок руху та зміна напрямку", "Розташування ТЗ на дорозі", "Швидкість руху",
  "Дистанція та інтервал", "Обгін", "Зупинка і стоянка", "Проїзд перехресть",
  "Перевага маршрутних ТЗ", "Пішохідні переходи", "Зовнішні світлові прилади",
  "Залізничні переїзди", "Перевезення пасажирів", "Перевезення вантажу",
  "Буксирування", "Навчальна їзда", "Рух у колонах", "Житлова та пішохідна зона",
  "Рух по автомагістралях", "Гірські дороги і спуски", "Міжнародний рух",
  "Номерні та розпізнавальні знаки", "Технічний стан ТЗ", "Окремі питання руху",
  "Дорожні знаки", "Основи безпечного водіння", "Основи права", "Етика водіння",
  "Європротокол", "Категорії А — загальні", "Категорії А — будова", "Категорії А — право",
  "Категорії А — безпека", "Категорії В — загальні", "Категорії В — будова",
  "Категорії В — право", "Категорії В — безпека", "Категорії C — загальні",
  "Категорії C — будова", "Категорії C — право", "Категорії C — безпека",
  "Категорії D — загальні", "Категорії D — будова", "Категорії D — право",
  "Категорії D — безпека", "Причепи — загальні", "Причепи — будова", "Причепи — право",
  "Причепи — безпека", "Категорія T — загальні", "Категорія T — будова", "Категорія T — право",
];
