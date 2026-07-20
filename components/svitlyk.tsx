// Reusable «Світлик» mascot (Wave-12a §C). Ported ONCE from the landing (variant-g.html:
// `<symbol id="svitlyk">` + the `#lg` refraction filter def). `SvitlykSprite` holds the hidden
// definitions and is mounted a SINGLE time in the (app) shell; `Svitlyk` `<use>`s the symbol
// wherever the mascot appears (empty states, result screen — placed by later tasks).
//
// Taste law: Світлик is STATIC in-app (no float animation — Danil forbids a floating scroll
// companion). A grounded shadow is fine; the SVG's own `#mglow` drop-shadow stays subtle and
// task 13 drops it under reduced-motion / on phones. `#lg` ships defined-but-unused this wave
// (0 lenses; W12b applies it), so `#svitlyk` and `#lg` are available on every app screen.

/**
 * Hidden `<defs>` sprite: the shared `<symbol id="svitlyk">` + the `#lg` refraction filter and the
 * mascot's own `#mbody` gradient / `#mglow` glow. Visually hidden (0×0, absolute) and aria-hidden.
 * Mount exactly ONCE in the app shell.
 */
export function SvitlykSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        {/* softened slate body gradient (page-harmonised: warmer/softer than near-black) */}
        <linearGradient id="mbody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#475a63" />
          <stop offset="1" stopColor="#33424a" />
        </linearGradient>
        {/* soft glow consistent with the page's soft shadows */}
        <filter id="mglow" x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="4" stdDeviation="4.5" floodColor="#3a525a" floodOpacity=".28" />
        </filter>
        {/* single edge-concentrated liquid-glass displacement lens (Chromium) — defined-but-unused this wave */}
        <filter id="lg" x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.014" numOctaves="2" seed="11" stitchTiles="stitch" result="n" />
          <feGaussianBlur in="n" stdDeviation="1.4" result="sn" />
          <feDisplacementMap in="SourceGraphic" in2="sn" scale="92" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <symbol id="svitlyk" viewBox="0 0 100 100">
          {/* ground shadow (stays grounded) */}
          <ellipse cx="50" cy="93" rx="24" ry="5" fill="#2B2F36" opacity=".12" />
          {/* body group (no CSS class → no landing float animation binds; static in-app) */}
          <g filter="url(#mglow)">
            <rect x="28" y="10" width="44" height="80" rx="22" fill="url(#mbody)" />
            <rect x="31" y="13" width="38" height="30" rx="16" fill="#fff" opacity=".05" />
            {/* soft top-left specular highlight (glass-era polish, kept subtle) */}
            <ellipse cx="40" cy="20" rx="9" ry="5" fill="#fff" opacity=".14" />
            <circle cx="50" cy="29" r="11" fill="#FFB89A" /> {/* red/coral */}
            <circle cx="50" cy="51" r="11" fill="#FFE08A" /> {/* amber */}
            <circle cx="50" cy="73" r="11" fill="#9AD9B8" /> {/* green (go) — page soft-green token */}
            <circle cx="46.3" cy="71.5" r="1.7" fill="#1f5b45" /> {/* eyes */}
            <circle cx="53.7" cy="71.5" r="1.7" fill="#1f5b45" />
            {/* smile */}
            <path d="M45 75.5 q5 4 10 0" stroke="#1f5b45" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            {/* waving arm */}
            <rect x="68" y="44" width="14" height="6" rx="3" fill="url(#mbody)" transform="rotate(-22 68 47)" />
          </g>
        </symbol>
      </defs>
    </svg>
  );
}

/**
 * A single calm, STATIC placement of Світлик — `<use href="#svitlyk"/>` at the given `size` with an
 * inverse (soft, radial) ground shadow beneath it. Decorative by default (aria-hidden); pass
 * `decorative={false}` to expose it as a labelled image (`role="img"` + Ukrainian aria-label).
 * No float / motion keyframes — grounded and quiet per the taste law.
 */
export function Svitlyk({
  size = 96,
  decorative = true,
  label = "Світлик — спокійний помічник",
  className,
}: {
  size?: number;
  decorative?: boolean;
  label?: string;
  className?: string;
}) {
  const a11y = decorative
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": label } as const);
  return (
    <span
      className={className}
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 0 }}
      {...a11y}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
        <use href="#svitlyk" />
      </svg>
      {/* inverse ground shadow — grounds the static mascot (no float) */}
      <span
        aria-hidden="true"
        style={{
          width: size * 0.5,
          height: size * 0.055,
          marginTop: size * -0.03,
          borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(43,47,54,.18), transparent)",
          filter: "blur(2px)",
        }}
      />
    </span>
  );
}
