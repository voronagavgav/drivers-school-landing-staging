// «Витинанка» — Ukrainian paper-cut openwork motifs.
// Pure presentational SVG. Ink = positive paper; the negative space between
// ink shapes IS the openwork cut (so a motif reads on any background).
// 1px offset drop-shadows are applied in CSS (page.tsx) for lifted-paper depth.

const INK = "#1C1B17";
const CORE = "#F08C00";

/* ------------------------------------------------------------------ */
/* Hero sun — half-cropped rosette. Symmetric, knife-cut, marigold core. */
/* ------------------------------------------------------------------ */
export function VytynankaSun({
  size = 460,
  ink = INK,
  core = CORE,
  className,
  spinId,
}: {
  size?: number;
  ink?: string;
  core?: string;
  className?: string;
  spinId?: string;
}) {
  const C = 200;
  const rayCount = 24;
  const petalCount = 12;
  const rays = Array.from({ length: rayCount }, (_, i) => (i * 360) / rayCount);
  const petals = Array.from({ length: petalCount }, (_, i) => (i * 360) / petalCount);
  const facePetals = Array.from({ length: 8 }, (_, i) => (i * 360) / 8);

  // A single ray pointing up: alternating long / short spikes.
  const ray = (long: boolean) => {
    const base = 118;
    const tip = long ? 196 : 166;
    const w = long ? 6 : 4;
    return `M ${C - w} ${C - base} L ${C} ${C - tip} L ${C + w} ${C - base} Z`;
  };
  // Almond leaf pointing up (mid ring openwork).
  const leaf = () => {
    const ri = 84;
    const ro = 116;
    const w = 13;
    const rm = (ri + ro) / 2;
    return `M ${C} ${C - ri}
      C ${C + w} ${C - rm}, ${C + w} ${C - ro + 4}, ${C} ${C - ro}
      C ${C - w} ${C - ro + 4}, ${C - w} ${C - rm}, ${C} ${C - ri} Z`;
  };
  // Small face petal (inside the marigold core, ink openwork).
  const facePetal = () => {
    const ri = 20;
    const ro = 50;
    const w = 8;
    const rm = (ri + ro) / 2;
    return `M ${C} ${C - ri}
      C ${C + w} ${C - rm}, ${C + w} ${C - ro + 3}, ${C} ${C - ro}
      C ${C - w} ${C - ro + 3}, ${C - w} ${C - rm}, ${C} ${C - ri} Z`;
  };

  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Витинанка-сонце — символ готовності"
    >
      <g id={spinId} style={{ transformOrigin: "200px 200px" }}>
        {/* long/short rays */}
        <g fill={ink}>
          {rays.map((a, i) => (
            <path key={`r${a}`} d={ray(i % 2 === 0)} transform={`rotate(${a} ${C} ${C})`} />
          ))}
        </g>
        {/* small dots at ray gaps */}
        <g fill={ink}>
          {rays.map((a) => {
            const rad = ((a - 90 + 7.5) * Math.PI) / 180;
            return (
              <circle
                key={`d${a}`}
                cx={C + Math.cos(rad) * 138}
                cy={C + Math.sin(rad) * 138}
                r={3.4}
              />
            );
          })}
        </g>
        {/* mid openwork ring of almond leaves */}
        <g fill={ink}>
          {petals.map((a) => (
            <path key={`p${a}`} d={leaf()} transform={`rotate(${a} ${C} ${C})`} />
          ))}
        </g>
        {/* dashed inner ring (cut segments) */}
        <circle cx={C} cy={C} r={74} fill="none" stroke={ink} strokeWidth={3.5} strokeDasharray="9 7" />
        {/* marigold core */}
        <circle cx={C} cy={C} r={64} fill={core} />
        {/* ink face petals on the core = openwork sun face */}
        <g fill={ink}>
          {facePetals.map((a) => (
            <path key={`f${a}`} d={facePetal()} transform={`rotate(${a} ${C} ${C})`} />
          ))}
        </g>
        <circle cx={C} cy={C} r={13} fill={ink} />
        <circle cx={C} cy={C} r={6} fill={core} />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Section friezes — narrow openwork bands. Each variant unique.       */
/* ------------------------------------------------------------------ */
export function Frieze({
  variant = "garland",
  ink = INK,
  className,
  height = 34,
}: {
  variant?: "garland" | "diamond" | "leaf" | "wheat" | "bird" | "tree";
  ink?: string;
  className?: string;
  height?: number;
}) {
  const id = `frieze-${variant}-${ink.replace("#", "")}`;

  const tile = () => {
    if (variant === "wheat") {
      // upright wheat sheaf — central stalk with mirrored grains + crest seed
      return (
        <g fill={ink}>
          <path d="M24 8 L24 30" stroke={ink} strokeWidth={2} fill="none" />
          <path d="M24 13 C20 11 18 13 20 17 C23 16 24 15 24 13 Z" />
          <path d="M24 13 C28 11 30 13 28 17 C25 16 24 15 24 13 Z" />
          <path d="M24 19 C20 17 18 19 20 23 C23 22 24 21 24 19 Z" />
          <path d="M24 19 C28 17 30 19 28 23 C25 22 24 21 24 19 Z" />
          <circle cx={24} cy={7} r={2.4} />
          <circle cx={6} cy={24} r={1.8} />
          <circle cx={42} cy={24} r={1.8} />
        </g>
      );
    }
    if (variant === "bird") {
      // two mirrored folk birds flanking a central bud
      return (
        <g fill={ink}>
          <path d="M4 23 Q10 12 18 16 Q14 18 14 22 Q10 20 8 25 Q6 23 4 23 Z" />
          <path d="M44 23 Q38 12 30 16 Q34 18 34 22 Q38 20 40 25 Q42 23 44 23 Z" />
          <circle cx={24} cy={15} r={2.8} />
          <path d="M24 18 Q21 24 24 29 Q27 24 24 18 Z" />
        </g>
      );
    }
    if (variant === "tree") {
      // tree-of-life — central trunk, symmetric branches, berry tips
      return (
        <>
          <g stroke={ink} strokeWidth={2} fill="none">
            <path d="M24 30 L24 9" />
            <path d="M24 22 Q16 20 14 13" />
            <path d="M24 22 Q32 20 34 13" />
            <path d="M24 16 Q19 14 17 9" />
            <path d="M24 16 Q29 14 31 9" />
          </g>
          <g fill={ink}>
            <circle cx={24} cy={8} r={2.6} />
            <circle cx={14} cy={12} r={2} />
            <circle cx={34} cy={12} r={2} />
            <circle cx={17} cy={8} r={1.6} />
            <circle cx={31} cy={8} r={1.6} />
          </g>
        </>
      );
    }
    if (variant === "diamond") {
      // linked diamonds with a punched centre + connector dots
      return (
        <g stroke={ink} strokeWidth={2} fill="none">
          <path d="M0 18 L12 6 L24 18 L12 30 Z" />
          <path d="M24 18 L36 6 L48 18 L36 30 Z" />
          <circle cx={12} cy={18} r={2.6} fill={ink} stroke="none" />
          <circle cx={36} cy={18} r={2.6} fill={ink} stroke="none" />
          <circle cx={0} cy={18} r={1.8} fill={ink} stroke="none" />
          <circle cx={48} cy={18} r={1.8} fill={ink} stroke="none" />
        </g>
      );
    }
    if (variant === "leaf") {
      // vine with mirrored leaves and berries
      return (
        <g fill={ink}>
          <path d="M0 18 Q24 4 48 18" stroke={ink} strokeWidth={2} fill="none" />
          <path d="M12 18 C9 9 15 6 18 12 C15 16 13 17 12 18 Z" />
          <path d="M36 18 C39 9 33 6 30 12 C33 16 35 17 36 18 Z" />
          <circle cx={24} cy={11} r={2.8} />
          <circle cx={6} cy={22} r={2} />
          <circle cx={42} cy={22} r={2} />
        </g>
      );
    }
    // garland — double mirrored scallop wave with hanging drops + crest dots
    return (
      <g stroke={ink} strokeWidth={2} fill="none">
        <path d="M0 12 Q12 26 24 12 T48 12" />
        <path d="M0 24 Q12 10 24 24 T48 24" />
        <circle cx={12} cy={19} r={2.4} fill={ink} stroke="none" />
        <circle cx={36} cy={17} r={2.4} fill={ink} stroke="none" />
        <path d="M24 18 l-3 6 h6 Z" fill={ink} stroke="none" />
      </g>
    );
  };

  return (
    <svg
      className={className}
      width="100%"
      height={height}
      viewBox={`0 0 480 36`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id={id} x="0" y="0" width="48" height="36" patternUnits="userSpaceOnUse">
          {tile()}
        </pattern>
      </defs>
      <rect x="0" y="0" width="480" height="36" fill={`url(#${id})`} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Corner motif — tiny cut-paper flourish for card corners.            */
/* ------------------------------------------------------------------ */
export function CornerMotif({
  size = 40,
  ink = INK,
  className,
}: {
  size?: number;
  ink?: string;
  className?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden="true">
      <g fill={ink}>
        <path d="M2 2 C2 14 8 20 20 20 C8 20 2 26 2 38 C2 26 -4 20 2 2 Z" opacity={0} />
        <path d="M4 4 C4 15 9 20 20 20 C9 20 4 25 4 36" fill="none" stroke={ink} strokeWidth={2} />
        <circle cx={4} cy={4} r={3} />
        <path d="M12 4 C12 10 8 12 4 12" fill="none" stroke={ink} strokeWidth={2} />
        <circle cx={20} cy={20} r={2.4} />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Rosette — circular openwork gauge frame around the readiness dial.  */
/* Center is hollow (children overlaid in page).                       */
/* ------------------------------------------------------------------ */
export function Rosette({
  size = 300,
  ink = INK,
  core = CORE,
  className,
}: {
  size?: number;
  ink?: string;
  core?: string;
  className?: string;
}) {
  const C = 150;
  const outer = Array.from({ length: 20 }, (_, i) => (i * 360) / 20);
  const inner = Array.from({ length: 20 }, (_, i) => (i * 360) / 20);
  const spike = () => `M ${C - 4} ${C - 108} L ${C} ${C - 124} L ${C + 4} ${C - 108} Z`;
  const innerLeaf = () => {
    const ri = 96;
    const ro = 116;
    const w = 6;
    const rm = (ri + ro) / 2;
    return `M ${C} ${C - ri}
      C ${C + w} ${C - rm}, ${C + w} ${C - ro + 2}, ${C} ${C - ro}
      C ${C - w} ${C - ro + 2}, ${C - w} ${C - rm}, ${C} ${C - ri} Z`;
  };
  return (
    <svg viewBox="0 0 300 300" width={size} height={size} className={className} aria-hidden="true">
      <g fill={ink}>
        {outer.map((a) => (
          <path key={`s${a}`} d={spike()} transform={`rotate(${a} ${C} ${C})`} />
        ))}
      </g>
      <g fill={ink}>
        {inner.map((a) => (
          <path key={`il${a}`} d={innerLeaf()} transform={`rotate(${a + 9} ${C} ${C})`} />
        ))}
      </g>
      <circle cx={C} cy={C} r={92} fill="none" stroke={ink} strokeWidth={3} strokeDasharray="7 6" />
      <circle cx={C} cy={C} r={84} fill="none" stroke={core} strokeWidth={2} opacity={0.55} />
    </svg>
  );
}
