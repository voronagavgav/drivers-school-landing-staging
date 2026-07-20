"use client";

/* ══ HERO h8g «Проспект» — the h8 block, ground swapped for a Kyiv artery ═══════
   Everything that made h8 h8 is INHERITED and frozen (cloned from h8d): the
   asymmetric left-set type, the marking-yellow «правду», the solid-yellow CTA
   popping off a blue family, the two real captures overlapping at the lower-right
   and cropped clean by the fold, the entrance choreography, the pointer bloom, the
   magnetic CTA, the whole easing family. ONLY the ground changes — and here it is
   the marketing point itself: the OWNER's chosen photo, a REAL Kyiv artery at dusk
   — a broad dual-carriageway alive with long-exposure gold traffic, and on the
   horizon, unmistakable, Батьківщина-мати (the Motherland Monument).

   ASPECT-ADAPTIVE GROUND (the whole point of this variant): ONE photo, three
   PREBAKED crops so nothing important is ever cut, on any screen. Each crop is
   pre-composed (sky-darkened top for copy, gold horizon band carrying the
   monument, road with its gold traffic lower) — so CSS is just background-size:
   cover with near-center positioning + minimal per-crop nudges. The art direction
   lives in the CROPS, not in CSS gymnastics. Exactly ONE crop downloads per
   viewport (cascade-override → only the winning background-image is fetched):
     · std  (2000×1333, 3:2)   — DEFAULT: tablets + desktops
     · tall (1080×1800, 0.6)   — phones,        @media (max-width:620px)
     · wide (2600×867, 3:1)    — large desktops, @media (min-width:1900px)
   Every rule that sets the photo carries BOTH declarations: a plain url(webp)
   fallback FIRST, then image-set(avif type, webp type).

   SAFE-ZONE LAW (acceptance criterion): Батьківщина-мати's silhouette stays
   visible + identifiable — never hidden under copy, phones, or scrims — at 390 /
   768 / 1280 / 1920 / 2560; the road with its gold traffic reads near/below the
   phones. The monument sits center-ish (~58% x, ~40% y) in every crop, landing in
   the gap between the left-set copy and the lower-right phones; scrims fade before
   the horizon so the figure is never reduced to a shape.

   The crops already carry the navy/gold night-grade; a low-opacity #1E5BD6 cast +
   the purposeful scrims (top copy-zone darkening + desktop left copy-scrim) finish
   the h8 family — pulling the sky to a cool navy (marking-yellow gold, not khaki)
   and holding white copy ≥4.5:1 / «правду» + yellow ≥3:1 against the REAL pixels.

   Background photo: Unsplash (Unsplash License — free commercial use), photo id
   juFAuf8-DBo, unsplash.com. Night-graded aspect-crop set (chosen by the owner);
   served as /lp/v36-bg-prospekt-{std,wide,tall}.avif (+ .webp fallback) via
   image-set, one crop per viewport.
   ══════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { CustomEase } from "gsap/CustomEase";
import { CustomBounce } from "gsap/CustomBounce";
import { ArrowRight, Check } from "lucide-react";
import { COPY, CTA } from "./copy";
import { Phone } from "./_body";

// Register the signature-motion plugins once, client-side only (SSR-safe guard —
// the established v36/lp registration pattern). CustomBounce needs CustomEase.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, CustomBounce);
}

// fine film grain — a tiny fractal-noise tile, overlaid low so the block reads
// rich, not flat. Pure atmosphere (no figure), decoded once as a data URI.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='150'%20height='150'%3E%3Cfilter%20id='n'%3E%3CfeTurbulence%20type='fractalNoise'%20baseFrequency='0.9'%20numOctaves='2'%20stitchTiles='stitch'/%3E%3C/filter%3E%3Crect%20width='150'%20height='150'%20filter='url(%23n)'/%3E%3C/svg%3E\")";

const CSS = `
/* ── the block: the Проспект ground, aspect-adaptive, art-directed for contrast ─
   Layer order (top→bottom paints last→first):
     (1) copy-zone scrim — a top linear darkening that seats white copy ≥4.5:1
         over the navy sky, fading OUT by ~40% so the monument + gold horizon band
         stay luminous (Батьківщина-мати is never scrimmed into a shape).
     (2) left copy-scrim (desktop) — a horizontal darkening under the left-set
         copy so the lower sub/CTA/note clear ≥4.5:1; it fades to 0 by ~52% — well
         LEFT of the monument (~58% x) — so the figure stays recognizable.
     (3) brand-blue cast — a low-opacity #1E5BD6 wash pulling the dusk sky to a
         cool navy (marking-yellow gold, not khaki); the whole fold is one world.
     (4) lower vignette — seats the road + gold traffic as one grounded block,
         fading before the horizon band from below.
     (5) the photo — the prebaked STD crop (3:2), background-size:cover, near-
         centre (--bgx/--bgy nudge per crop). The art direction lives in the crop;
         the tall/wide crops swap in below at their breakpoints. Served AVIF→WebP
         via image-set (plain url(webp) fallback first for engines w/o type()).
   A soft inset darkens the edges so the scene feels lit, not printed. */
.v36 .hz8{position:relative;overflow:hidden;isolation:isolate;--bgx:50%;--bgy:46%;
  padding:clamp(30px,5.5vw,70px) 0 clamp(300px,40vw,430px);
  background-color:#0a1530;
  /* webp fallback stack first (older engines w/o image-set type()), then modern */
  background-image:
    linear-gradient(180deg, rgba(6,14,38,.86) 0%, rgba(6,14,38,.60) 20%, rgba(6,15,40,.22) 32%, rgba(6,15,40,0) 42%),
    linear-gradient(96deg, rgba(6,14,38,.82) 0%, rgba(6,14,38,.52) 24%, rgba(6,14,38,.12) 42%, rgba(6,14,38,0) 52%),
    linear-gradient(180deg, rgba(30,91,214,.24) 0%, rgba(30,91,214,.13) 54%, rgba(22,66,160,.22) 100%),
    radial-gradient(122% 56% at 50% 126%, rgba(3,8,24,.62) 0%, rgba(3,8,24,0) 46%),
    url("/lp/v36-bg-prospekt-std.webp");
  background-image:
    linear-gradient(180deg, rgba(6,14,38,.86) 0%, rgba(6,14,38,.60) 20%, rgba(6,15,40,.22) 32%, rgba(6,15,40,0) 42%),
    linear-gradient(96deg, rgba(6,14,38,.82) 0%, rgba(6,14,38,.52) 24%, rgba(6,14,38,.12) 42%, rgba(6,14,38,0) 52%),
    linear-gradient(180deg, rgba(30,91,214,.24) 0%, rgba(30,91,214,.13) 54%, rgba(22,66,160,.22) 100%),
    radial-gradient(122% 56% at 50% 126%, rgba(3,8,24,.62) 0%, rgba(3,8,24,0) 46%),
    image-set(url("/lp/v36-bg-prospekt-std.avif") type("image/avif"), url("/lp/v36-bg-prospekt-std.webp") type("image/webp"));
  background-repeat:no-repeat;
  background-size:cover,cover,cover,cover,cover;
  background-position:center top,left center,center,center,var(--bgx) var(--bgy);
  box-shadow:inset 0 0 240px 48px rgba(3,10,32,.50);}
/* fine grain overlay — barely there, blended into the ground */
.v36 .hz8::after{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;
  background-image:${GRAIN};background-size:150px 150px;opacity:.05;mix-blend-mode:overlay;}
.v36 .hz8 .wrap{position:relative;z-index:3;}
/* ── pointer bloom: an ADDITIVE light layer, invisible at rest (opacity:0) so the
   frozen static field is byte-identical; on a fine pointer it fades in and drifts
   ≤40px toward the cursor (screen-blended), reading as the field's light leaning
   into the cursor. Sits over the grain, behind the copy + phones. */
/* NOTE: no will-change here — a full-section (inset:0) layer left permanently
   promoted would keep a viewport-sized composited layer alive on every device
   (incl. reduced-motion / no-pointer). The pointer branch adds it on enter and
   removes it on leave, so the layer is promoted ONLY while it's actually drifting. */
/* over a photographic ground a screen blend washes out against the bright gold
   lamps; plus-lighter keeps the light additive so the bloom still reads as the
   field leaning into the cursor — over both the dark water and the gold lamp row. */
.v36 .hz8-bloom{position:absolute;inset:0;z-index:1;pointer-events:none;opacity:0;
  background:radial-gradient(120% 92% at 30% 6%, rgba(150,190,255,.26) 0%, rgba(150,190,255,0) 55%);
  mix-blend-mode:plus-lighter;}
@media (prefers-reduced-motion:reduce){.v36 .hz8-bloom{display:none;}}

/* ── copy, left-set on the field ─────────────────────────────────────────────*/
.v36 .hz8-copy{max-width:min(600px,58%);}
.v36 .hz8-kick{display:inline-flex;align-items:center;gap:9px;font-family:var(--font-display);font-weight:700;
  font-size:.875rem;color:#FFFFFF;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.26);
  padding:8px 15px;border-radius:999px;margin-bottom:22px;white-space:nowrap;max-width:100%;
  backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);}
.v36 .hz8-kick .dot{width:8px;height:8px;flex:none;border-radius:50%;background:#FFFFFF;box-shadow:0 0 0 4px rgba(255,255,255,.14);}
.v36 .hz8-kick .k-sep{opacity:.5;padding:0 3px;}
/* text-shadows are firmed up vs h8: over a photo the scrims carry the contrast,
   but a tight dark shadow is cheap insurance for any pixel that rides a lamp. */
.v36 .hz8-h1{font-family:var(--font-display);font-weight:800;color:#FFFFFF;
  font-size:clamp(2.5rem,6.5vw,4.6rem);line-height:1.02;letter-spacing:-0.038em;text-wrap:balance;
  text-shadow:0 2px 22px rgba(4,11,32,.60),0 1px 3px rgba(4,11,32,.5);}
/* ONE word lifts to marking-yellow — pure colour emphasis, no underline, no skew */
.v36 .hz8-hi{color:var(--yellow);text-shadow:0 1px 0 rgba(70,44,0,.55),0 2px 12px rgba(6,16,44,.5);
  display:inline-block;transform-origin:center 62%;}
.v36 .hz8-sub{margin:24px 0 0;max-width:44ch;color:#F3F7FE;
  font-size:clamp(1.05rem,1.5vw,1.22rem);line-height:1.62;text-wrap:pretty;
  text-shadow:0 1px 12px rgba(4,11,32,.55);}
.v36 .hz8-cta{display:flex;gap:14px;flex-wrap:wrap;margin-top:32px;}
/* magnetic wrapper around the primary CTA — the ≤6px cursor pull rides on this
   span so the button keeps its own :hover translateY lift (inline transform on the
   button itself would clobber it). display:contents-free inline-flex, zero layout. */
.v36 .hz8-magnet{display:inline-flex;}

/* the primary: solid marking-yellow, dark ink, popping off the blue */
.v36 .hz8-cta .btn-yellow{background:var(--yellow);color:#3A2400;border-color:transparent;
  box-shadow:0 14px 30px -12px rgba(245,179,1,.75),0 2px 0 0 var(--yellow-600);}
.v36 .hz8-cta .btn-yellow:hover{background:#FFC22B;transform:translateY(-2px);
  box-shadow:0 20px 38px -12px rgba(245,179,1,.85),0 2px 0 0 var(--yellow-600);}
.v36 .hz8-cta .btn-yellow svg{transition:transform .2s cubic-bezier(.2,.8,.3,1);}
.v36 .hz8-cta .btn-yellow:hover svg{transform:translateX(3px);}
/* the secondary: quiet white outline on the field */
.v36 .hz8-cta .btn-onblue{background:rgba(255,255,255,.04);color:#F3F7FE;border-color:rgba(255,255,255,.5);}
.v36 .hz8-cta .btn-onblue:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.8);transform:translateY(-2px);}
/* focus ring readable on BOTH the blue field and the yellow fill — the global
   blue outline vanishes on this hero's #1E5BD6 field, so re-scope it to white
   (type qualifier + full shorthand to beat the .v36 :focus-visible global) */
.v36 .hz8 a:focus-visible,.v36 .hz8 button:focus-visible{
  outline:3px solid #FFFFFF;outline-offset:3px;box-shadow:0 0 0 7px rgba(9,26,74,.4);}

/* availability note — the SINGLE traffic-green accent, in a crisp light disc */
.v36 .hz8-note{margin-top:20px;font-size:.95rem;color:#DBE6FA;display:flex;align-items:center;gap:9px;
  text-shadow:0 1px 12px rgba(4,11,32,.55);}
.v36 .hz8-note .chk{width:22px;height:22px;flex:none;border-radius:50%;background:rgba(255,255,255,.96);
  display:grid;place-items:center;box-shadow:0 4px 12px -6px rgba(6,16,44,.5);}
.v36 .hz8-note .chk svg{width:14px;height:14px;color:var(--green);}

/* ── the two captures, overlapping at the fold, cropped clean by the edge ─────
   anchored bottom-right; the section's overflow crops their lower portion, so
   the crisp blue→light seam runs THROUGH the phones — the bridge across it. */
.v36 .hz8-stage{position:absolute;right:clamp(16px,2vw,44px);bottom:clamp(-40px,-3vw,-10px);
  width:min(48%,560px);height:100%;z-index:2;pointer-events:none;}
.v36 .hz8-phone{position:absolute;bottom:0;width:min(30vw,282px);transform-origin:bottom center;}
/* the blue-radial glow is imperceptible on the blue field — dead weight here */
.v36 .hz8-phone .phone-glow{display:none;}
.v36 .hz8-phone .phone{max-width:100%;
  /* white rim light caught from the field + deep lift-shadow on the blue */
  box-shadow:0 3px 0 1px rgba(255,255,255,.28) inset,0 0 0 1px rgba(255,255,255,.10) inset,
    0 46px 84px -32px rgba(6,18,52,.78),0 20px 44px -22px rgba(6,18,52,.58);}
.v36 .hz8-back{right:24%;bottom:26px;z-index:1;transform:rotate(7deg);}
/* deepen the overlap + pan the capture so the exposed strip lands on the exam
   header/number row, not mid-question — no readable half-words at the seam */
.v36 .hz8-back .phone{max-width:246px;filter:brightness(.92);}
.v36 .hz8-back .phone-screen img{object-position:top left;}
.v36 .hz8-front{right:-2%;bottom:-16px;z-index:2;transform:rotate(-5deg);}

@media (max-width:960px){
  /* one continuous scene — copy leads, the ground runs to the fold where a single
     capture peeks up, cropped by the same clean edge. Copy is FULL-WIDTH now, so
     the horizontal left-scrim can't hide it — swap the desktop left-scrim for a
     top-anchored copy band (top scrim strengthened, left scrim OFF). STILL the STD
     crop (default until 620); only the scrims + position change: nudge --bgy down
     so the monument's horizon sits just below the copy block and the road with its
     gold traffic runs toward the single capture at the fold. */
  .v36 .hz8{padding-bottom:0;--bgx:52%;--bgy:52%;
    background-image:
      linear-gradient(180deg, rgba(6,14,38,.88) 0%, rgba(6,14,38,.68) 24%, rgba(6,15,40,.30) 38%, rgba(6,15,40,0) 48%),
      linear-gradient(96deg, rgba(6,14,38,0), rgba(6,14,38,0)),
      linear-gradient(180deg, rgba(30,91,214,.24) 0%, rgba(30,91,214,.13) 54%, rgba(22,66,160,.22) 100%),
      radial-gradient(122% 56% at 50% 126%, rgba(3,8,24,.56) 0%, rgba(3,8,24,0) 46%),
      url("/lp/v36-bg-prospekt-std.webp");
    background-image:
      linear-gradient(180deg, rgba(6,14,38,.88) 0%, rgba(6,14,38,.68) 24%, rgba(6,15,40,.30) 38%, rgba(6,15,40,0) 48%),
      linear-gradient(96deg, rgba(6,14,38,0), rgba(6,14,38,0)),
      linear-gradient(180deg, rgba(30,91,214,.24) 0%, rgba(30,91,214,.13) 54%, rgba(22,66,160,.22) 100%),
      radial-gradient(122% 56% at 50% 126%, rgba(3,8,24,.56) 0%, rgba(3,8,24,0) 46%),
      image-set(url("/lp/v36-bg-prospekt-std.avif") type("image/avif"), url("/lp/v36-bg-prospekt-std.webp") type("image/webp"));}
  .v36 .hz8-copy{max-width:100%;}
  /* concept parity with desktop: the section's overflow slices the phone's lower
     ~18% at the fold seam, so the crisp edge runs THROUGH the capture here too */
  .v36 .hz8-stage{position:relative;right:auto;bottom:auto;width:100%;height:auto;
    display:flex;justify-content:center;margin-top:clamp(28px,7vw,44px);
    margin-bottom:clamp(-150px,-24vw,-105px);}
  .v36 .hz8-phone{position:relative;bottom:auto;right:auto;width:min(60vw,236px);}
  .v36 .hz8-back{display:none;}
  .v36 .hz8-front{transform:rotate(-3deg);}
}
@media (max-width:620px){
  /* PHONES — swap in the prebaked TALL crop (1080×1800, 0.6): the portrait band
     puts the navy sky under the copy up top, Батьківщина-мати on the gold horizon
     mid-frame, and the road with its gold traffic filling the lower ~60% toward
     the single capture. background-size:cover ≈ matches the crop's own ratio, so
     near-centre positioning needs no gymnastics. This is the ONLY rule that sets
     the tall crop, so it is the sole image fetched on phones. --bgx nudges the
     figure RIGHT of the stacked full-width CTA so the whole silhouette (pedestal,
     raised sword + shield) reads clear of the buttons — a horizontal-only nudge,
     no zoom, so the crop's baked art direction is untouched. */
  .v36 .hz8{--bgx:38%;--bgy:44%;padding-top:12px;
    background-image:
      linear-gradient(180deg, rgba(6,14,38,.88) 0%, rgba(6,14,38,.66) 22%, rgba(6,15,40,.24) 34%, rgba(6,15,40,0) 44%),
      linear-gradient(96deg, rgba(6,14,38,0), rgba(6,14,38,0)),
      linear-gradient(180deg, rgba(30,91,214,.24) 0%, rgba(30,91,214,.13) 54%, rgba(22,66,160,.22) 100%),
      radial-gradient(132% 46% at 50% 128%, rgba(3,8,24,.42) 0%, rgba(3,8,24,0) 44%),
      url("/lp/v36-bg-prospekt-tall.webp");
    background-image:
      linear-gradient(180deg, rgba(6,14,38,.88) 0%, rgba(6,14,38,.66) 22%, rgba(6,15,40,.24) 34%, rgba(6,15,40,0) 44%),
      linear-gradient(96deg, rgba(6,14,38,0), rgba(6,14,38,0)),
      linear-gradient(180deg, rgba(30,91,214,.24) 0%, rgba(30,91,214,.13) 54%, rgba(22,66,160,.22) 100%),
      radial-gradient(132% 46% at 50% 128%, rgba(3,8,24,.42) 0%, rgba(3,8,24,0) 44%),
      image-set(url("/lp/v36-bg-prospekt-tall.avif") type("image/avif"), url("/lp/v36-bg-prospekt-tall.webp") type("image/webp"));}
  .v36 .hz8-h1{font-size:clamp(2.15rem,9.6vw,2.9rem);}
  .v36 .hz8-sub{max-width:100%;}
  /* pill must never wrap: drop the trailing benefit segment on narrow screens */
  .v36 .hz8-kick{font-size:.8rem;}
  .v36 .hz8-kick .k-tail{display:none;}
  /* ── SAFE-ZONE fix (phones): the tall crop is height-fit under cover, so --bgy
     has NO vertical slack and the monument's baked screen-band is fixed (~484px
     down; sword-tip→shoulders ≈484–560 at 390). The opaque yellow CTA otherwise
     lands right on the raised sword + head. FIX = tighten the mobile vertical
     rhythm so the whole copy stack (hence the yellow button's BOTTOM edge) rides
     ABOVE the sword tip, while the phone stage's top margin GROWS by the same
     amount — this pins the phones (and the hero's height, hence the height-fit
     crop's monument band) exactly where they were, so the figure doesn't chase
     the button up. Net: the opaque yellow clears the silhouette; the head/sword
     read in the gap below it and through the 4%-opaque outline button. Measured
     at 390: yellow bottom ~465 (was 520), monument top ~484 → ~19px clearance. */
  .v36 .hz8-kick{margin-bottom:12px;}
  .v36 .hz8-sub{margin-top:13px;}
  .v36 .hz8-cta{margin-top:16px;}
  /* hold the phones + hero height fixed: add back the ~55px the copy stack shed
     above, so the monument's height-fit band stays put (compensates the lift). */
  .v36 .hz8-stage{margin-top:clamp(78px,20vw,96px);}
}
@media (min-width:1900px){
  /* LARGE DESKTOPS / ULTRAWIDE — swap in the prebaked WIDE crop (2600×867, 3:1):
     a broad horizon band with a vast navy sky, Батьківщина-мати centre-right on
     the gold horizon, and the road with its gold traffic along the lower edge —
     so nothing important is cut when the hero goes wide-and-short. cover ≈ matches
     the crop's 3:1 at ~2560 (trims a little off each side at 1900); near-centre
     positioning keeps the monument (~58% x) safely in frame. This is the ONLY rule
     that sets the wide crop, so it is the sole image fetched on large desktops. */
  .v36 .hz8{--bgx:50%;--bgy:50%;
    background-image:
      linear-gradient(180deg, rgba(6,14,38,.86) 0%, rgba(6,14,38,.58) 22%, rgba(6,15,40,.20) 36%, rgba(6,15,40,0) 48%),
      linear-gradient(96deg, rgba(6,14,38,.80) 0%, rgba(6,14,38,.48) 22%, rgba(6,14,38,.10) 38%, rgba(6,14,38,0) 48%),
      linear-gradient(180deg, rgba(30,91,214,.24) 0%, rgba(30,91,214,.13) 54%, rgba(22,66,160,.22) 100%),
      radial-gradient(120% 60% at 50% 124%, rgba(3,8,24,.58) 0%, rgba(3,8,24,0) 48%),
      url("/lp/v36-bg-prospekt-wide.webp");
    background-image:
      linear-gradient(180deg, rgba(6,14,38,.86) 0%, rgba(6,14,38,.58) 22%, rgba(6,15,40,.20) 36%, rgba(6,15,40,0) 48%),
      linear-gradient(96deg, rgba(6,14,38,.80) 0%, rgba(6,14,38,.48) 22%, rgba(6,14,38,.10) 38%, rgba(6,14,38,0) 48%),
      linear-gradient(180deg, rgba(30,91,214,.24) 0%, rgba(30,91,214,.13) 54%, rgba(22,66,160,.22) 100%),
      radial-gradient(120% 60% at 50% 124%, rgba(3,8,24,.58) 0%, rgba(3,8,24,0) 48%),
      image-set(url("/lp/v36-bg-prospekt-wide.avif") type("image/avif"), url("/lp/v36-bg-prospekt-wide.webp") type("image/webp"));}
}
`;

const FRONT = {
  src: "/lp/v36-m-runner.png",
  alt: "Екран тренування у телефоні: питання з ілюстрацією дороги, прогрес 1 з 15 і варіанти відповіді",
};
const BACK = {
  src: "/lp/v36-m-exam.png",
  alt: "Екран екзаменаційної симуляції у телефоні: питання 1 з 20, таймер 19:58, навігація по 20 питаннях",
};

export function HeroProspekt() {
  const ref = useRef<HTMLElement>(null);
  const c = COPY;
  // Lead with the hook + the personalization clause only; the third sentence
  // («1 757 офіційних питань…») repeats the stat the proof band below already
  // owns, so it's dropped here — every rendered word stays verbatim from COPY.
  const subLead = c.hero.sub.split(/(?<=\.)\s+/).slice(0, 2).join(" ");
  // Kicker as segments so the trailing benefit clause can drop on narrow screens
  // (a pill must never wrap) — segments are verbatim slices of COPY.hero.kicker.
  const kickerSegs = c.hero.kicker.split(" · ");
  // The back capture is display:none under 960px; only mount it on wide
  // viewports so the narrow viewport never downloads bytes it can't show.
  // Defaults false → mobile SSR/first paint skips it; it's decorative (not
  // LCP — the front phone carries priority) so a post-hydration mount is fine.
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 961px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      // ── the signature easing family — ONE world, ONE feel ──────────────────
      // hz8-pop: a lone cubic with a single ~3.7% overshoot (peak measured 1.037).
      // Snappy start (steep first third), one confident settle, zero wobble — a
      // single bezier can't oscillate. Every "pop" in this hero rides this curve.
      const pop = CustomEase.create("hz8-pop", "0.2, 0.9, 0.3, 1.14");

      const mm = gsap.matchMedia();

      // ═══ ENTRANCE + ambient buoyancy — all widths, motion allowed ═══════════
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Pre-hide ONLY the headline synchronously: SplitText must wait for fonts,
        // so without this the h1 would flash visible→hidden when the split fires.
        // Everything else is visible-by-default (gsap.from, repo standard); SSR
        // text is never CSS-hidden, so JS-off still reads the full fold.
        gsap.set(".hz8-h1", { autoAlpha: 0 });

        const tl = gsap.timeline({ defaults: { ease: pop } });
        // supporting copy — a quiet 8px fade-rise (deliberately NOT the pop family)
        tl.from(".hz8-kick", { autoAlpha: 0, y: 8, duration: 0.4, ease: "power2.out" }, 0);
        tl.from(".hz8-sub", { autoAlpha: 0, y: 8, duration: 0.45, ease: "power2.out" }, 0.2);
        // (phone entrance + ambient bob live in a separate [wide]-keyed effect below,
        //  so they bind AFTER the conditionally-mounted back phone is in the DOM)
        // primary CTA row — the confident overshoot pop, anchored to the copy's left
        tl.from(".hz8-cta", { autoAlpha: 0, y: 12, scale: 0.92, transformOrigin: "left center", duration: 0.5 }, 0.42);
        // availability note — one last soft fade-rise
        tl.from(".hz8-note", { autoAlpha: 0, y: 8, duration: 0.4, ease: "power2.out" }, 0.54);

        // Headline: split into measured line boxes AFTER fonts settle, snap them up
        // with the pop stagger (~80ms), then land «правду» with a single 1.03 scale
        // settle. Revert the split on complete → end-state DOM is byte-identical.
        let split: SplitText | null = null;
        let htl: gsap.core.Timeline | null = null;
        const buildHeadline = () => {
          if (!el.isConnected) return;
          split = SplitText.create(".hz8-h1", { type: "lines", aria: "auto", linesClass: "hz8-line" });
          gsap.set(".hz8-h1", { autoAlpha: 1 });
          const hi = el.querySelector<HTMLElement>(".hz8-hi");
          htl = gsap.timeline({
            onComplete: () => {
              split?.revert();
              gsap.set(".hz8-h1, .hz8-hi", { clearProps: "all" });
            },
          });
          htl.from(split.lines, { yPercent: 42, autoAlpha: 0, duration: 0.52, stagger: 0.08, ease: pop }, 0);
          // the yellow word lands last: one 1.03 scale settle (peak, then home)
          if (hi) htl.to(hi, { keyframes: { scale: [1.03, 1] }, duration: 0.34, ease: "power2.inOut" }, ">-0.14");
        };
        if (document.fonts?.status === "loaded") buildHeadline();
        else document.fonts.ready.then(buildHeadline);

        return () => {
          htl?.kill();
          split?.revert();
        };
      });

      // ═══ SCROLL — subtle counter-drift on the phone stage (desktop) ═════════
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 961px)", () => {
        gsap.fromTo(
          ".hz8-stage",
          { yPercent: 0 },
          {
            yPercent: -6, // ≤10% counter-drift
            ease: "none",
            immediateRender: false,
            scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.6 },
          },
        );
      });

      // ═══ POINTER — bloom tracking + CTA magnet (desktop, fine pointer only) ══
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 961px) and (pointer: fine)", () => {
        const bloom = el.querySelector<HTMLElement>(".hz8-bloom");
        const magnet = el.querySelector<HTMLElement>(".hz8-magnet");
        const btn = magnet?.querySelector<HTMLElement>("a");
        if (!bloom) return;

        // heavily damped bloom drift (≤40px), reused single tweens via quickTo
        const bx = gsap.quickTo(bloom, "x", { duration: 0.9, ease: "power3" });
        const by = gsap.quickTo(bloom, "y", { duration: 0.9, ease: "power3" });
        const bo = gsap.quickTo(bloom, "opacity", { duration: 0.5, ease: "power2" });
        const mx = magnet ? gsap.quickTo(magnet, "x", { duration: 0.35, ease: "power3" }) : null;
        const my = magnet ? gsap.quickTo(magnet, "y", { duration: 0.35, ease: "power3" }) : null;
        const clamp = gsap.utils.clamp(-40, 40);

        // promote the bloom layer ONLY while the cursor is in the hero (added on
        // enter, cleared on leave / branch teardown) — never a permanent layer.
        const onEnter = () => {
          bloom.style.willChange = "transform, opacity";
        };
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const nx = (e.clientX - r.left) / r.width - 0.5; // -0.5…0.5
          const ny = (e.clientY - r.top) / r.height - 0.5;
          bx(clamp(nx * 58));
          by(clamp(ny * 58));
          bo(0.72);
          if (btn && mx && my) {
            const b = btn.getBoundingClientRect();
            const dx = e.clientX - (b.left + b.width / 2);
            const dy = e.clientY - (b.top + b.height / 2);
            const dist = Math.hypot(dx, dy);
            if (dist < 80) {
              const k = (1 - dist / 80) * 6; // ≤6px pull toward cursor
              const inv = dist || 1;
              mx((dx / inv) * k);
              my((dy / inv) * k);
            } else {
              mx(0);
              my(0);
            }
          }
        };
        const onLeave = () => {
          bx(0);
          by(0);
          bo(0);
          bloom.style.willChange = ""; // drop the promoted layer when the cursor leaves
          if (magnet) gsap.set(magnet, { x: 0, y: 0 }); // instant reset on leave
        };
        el.addEventListener("pointerenter", onEnter);
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerleave", onLeave);
        return () => {
          el.removeEventListener("pointerenter", onEnter);
          el.removeEventListener("pointermove", onMove);
          el.removeEventListener("pointerleave", onLeave);
          bloom.style.willChange = "";
          gsap.set([bloom, magnet].filter(Boolean) as HTMLElement[], { clearProps: "all" });
        };
      });

      // ═══ REDUCED MOTION — land the designed static state, no motion ═════════
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".hz8-kick,.hz8-h1,.hz8-hi,.hz8-sub,.hz8-cta,.hz8-note,.hz8-phone,.hz8-magnet", {
          clearProps: "all",
        });
      });

      return () => mm.revert();
    }, ref);
    return () => ctx.revert();
  }, []);

  // ═══ PHONE MOTION — bound on `wide` so it can't race the back phone's mount ══
  // The back capture (.hz8-back) mounts only AFTER `wide` flips true (desktop);
  // building the phone tweens in the main context above — which resolves its
  // selectors once, at first mount, before that re-render — left .hz8-back bound
  // to nothing (no stagger, no bob; it hard-popped in static). Keying this effect
  // on [wide] guarantees BOTH captures are in the DOM before the entrance + bob
  // bind. On desktop we skip the wide=false pass (back not mounted yet) so the
  // front phone never double-plays; on mobile (.hz8-back is unmounted AND
  // display:none) the front phone still animates on the first pass.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const desktop = window.matchMedia("(min-width: 961px)").matches;
    // desktop + not-yet-wide ⇒ .hz8-back hasn't mounted; wait for the flip
    if (desktop && !wide) return;

    const ctx = gsap.context(() => {
      // hz8-drop: a restrained, weighty single bounce (low strength ⇒ one bounce,
      // never rubbery) for the phones arriving from below. Needs CustomEase.
      CustomBounce.create("hz8-drop", { strength: 0.34, squash: 0, endAtStart: false });
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // phones — weighty single-bounce arrival from 24px below with the 0.10
        // stagger; the CSS resting rotations (7deg / -5deg) are parsed by GSAP and
        // preserved (only y moves). Both captures are in the DOM now, so the
        // stagger + drop land on the front AND the back. Delayed ~0.28 to sit in
        // the same slot the main entrance timeline used to give them.
        gsap.from(".hz8-phone", {
          autoAlpha: 0,
          y: 24,
          duration: 0.62,
          stagger: 0.1,
          ease: "hz8-drop",
          delay: 0.28,
        });
        // buoyant ambient bob (kept from the shipped design) — begins AFTER the
        // entrance; immediateRender:false pins the excursion to 0…−12/−16px so it
        // never records the entrance start nor sinks the phones below the fold.
        gsap.fromTo(".hz8-front", { y: 0 }, { y: -12, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.2, immediateRender: false });
        gsap.fromTo(".hz8-back", { y: 0 }, { y: -16, duration: 4.0, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 1.3, immediateRender: false });
      });

      // reduced motion — land the phones at their designed resting state, no motion
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".hz8-phone", { clearProps: "all" });
      });

      return () => mm.revert();
    }, ref);
    return () => ctx.revert();
  }, [wide]);

  return (
    <section className="hz8" ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* additive pointer-bloom layer (invisible at rest; driven in the effect) */}
      <div className="hz8-bloom" aria-hidden />
      <div className="wrap">
        <div className="hz8-copy">
          <span className="hz8-kick hz8-rise">
            <span className="dot" />
            <span className="k-label">
              {kickerSegs.map((seg, i) => (
                <span key={i} className={i >= 2 ? "k-tail" : undefined}>
                  {i > 0 && <span className="k-sep"> · </span>}
                  {seg}
                </span>
              ))}
            </span>
          </span>
          <h1 className="hz8-h1 hz8-rise">
            {c.hero.headBefore}
            <span className="hz8-hi">{c.hero.headHi}</span>
            {c.hero.headAfter}
          </h1>
          <p className="hz8-sub hz8-rise">{subLead}</p>
          <div className="hz8-cta hz8-rise">
            <span className="hz8-magnet">
              <Link href={CTA.anon.href} className="btn btn-lg btn-yellow">
                {CTA.anon.label} <ArrowRight aria-hidden />
              </Link>
            </span>
            <Link href={CTA.register.href} className="btn btn-lg btn-onblue">
              {CTA.register.label}
            </Link>
          </div>
          <p className="hz8-note hz8-rise">
            <span className="chk">
              <Check aria-hidden />
            </span>
            {c.hero.note}
          </p>
        </div>
      </div>

      {/* two captures overlapping at the fold, cropped clean by the block's edge */}
      <div className="hz8-stage">
        {wide && (
          <div className="hz8-phone hz8-back">
            <Phone src={BACK.src} alt={BACK.alt} />
          </div>
        )}
        <div className="hz8-phone hz8-front">
          <Phone src={FRONT.src} alt={FRONT.alt} priority />
        </div>
      </div>
    </section>
  );
}
