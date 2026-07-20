// ---------------------------------------------------------------------------
// Pure sparkline geometry. No DB, no React. Turns a series of readiness scores
// into evenly-spaced points + an SVG polyline path string. The dashboard
// (task wave3-feat-07) wraps `path` in an SVG path element; this layer just
// does the math so it stays unit-testable without a DOM.
// ---------------------------------------------------------------------------

export interface SparklinePoint {
  x: number;
  y: number;
}

export interface SparklineOptions {
  /** Overall SVG width in px. Default 120 (inline-sparkline size). */
  width?: number;
  /** Overall SVG height in px. Default 32. */
  height?: number;
  /** Inset on every side so the stroke isn't clipped. Default 2. */
  padding?: number;
}

export interface Sparkline {
  points: SparklinePoint[];
  /** SVG polyline path: `M x y L x y …`, or `""` for an empty series. */
  path: string;
  width: number;
  height: number;
}

/** Round to 2 decimals so path strings are stable for snapshot assertions. */
const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Sparkline geometry for a series of values.
 *
 * x-coordinates are spread evenly across the drawable width (first point at the
 * left edge + padding, last at the right edge − padding). y-coordinates map
 * value→pixel with the MAX value at the top and the MIN at the bottom (y is
 * inverted for SVG), staying within `[padding, height − padding]`.
 *
 * Degenerate inputs are safe (no `NaN`, no throw): an empty array yields no
 * points and an empty path; a single value yields one centred point; an
 * all-equal series yields a flat horizontal line at the vertical midpoint.
 */
export function sparkline(values: number[], opts: SparklineOptions = {}): Sparkline {
  const width = opts.width ?? 120;
  const height = opts.height ?? 32;
  const padding = opts.padding ?? 2;

  const drawableWidth = width - padding * 2;
  const drawableHeight = height - padding * 2;
  const midY = round(height / 2);

  if (values.length === 0) {
    return { points: [], path: "", width, height };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  const points: SparklinePoint[] = values.map((value, i) => {
    // Single point sits centred; otherwise spread evenly left→right.
    const x =
      values.length === 1
        ? round(width / 2)
        : round(padding + (i / (values.length - 1)) * drawableWidth);
    // All-equal series (range === 0) → flat midline, no divide-by-zero.
    const y =
      range === 0 ? midY : round(padding + (1 - (value - min) / range) * drawableHeight);
    return { x, y };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return { points, path, width, height };
}
