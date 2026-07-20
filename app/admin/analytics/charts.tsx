// Lightweight, dependency-free analytics charts: pure inline SVG / CSS bars.
// No client JS, no chart library — these render on the server as static markup.
// Ukrainian-facing labels are passed in by the page.

import type { ReactNode } from "react";

export interface BarRow {
  name: string;
  count: number;
}

/**
 * Horizontal CSS bar list, widths scaled to the max value. Used for top
 * events/paths/devices/referrers/categories. Renders an empty state when there are no rows.
 */
export function BarList({
  rows,
  empty = "Немає даних.",
  valueFormat,
  labelFor,
}: {
  rows: BarRow[];
  empty?: string;
  valueFormat?: (count: number) => string;
  labelFor?: (name: string) => ReactNode;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted">{empty}</p>;
  }
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => {
        const pct = Math.max(2, Math.round((r.count / max) * 100));
        return (
          <li key={`${r.name}-${i}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium text-ink" title={r.name}>
                {labelFor ? labelFor(r.name) : r.name}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-muted">
                {valueFormat ? valueFormat(r.count) : r.count}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-field">
              <div
                className="h-full rounded-full bg-green-deep/70"
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export interface SeriesPoint {
  label: string;
  count: number;
}

/**
 * Events-over-time as an inline SVG bar chart. Fixed viewBox, scales bars to the
 * max value; labels are thinned so the axis never overcrowds. No client JS.
 */
export function TimeSeriesBars({
  points,
  unitLabel,
}: {
  points: SeriesPoint[];
  unitLabel: string;
}) {
  if (points.length === 0) {
    return <p className="text-sm text-muted">Немає подій за обраний період.</p>;
  }
  const max = Math.max(1, ...points.map((p) => p.count));
  const total = points.reduce((a, p) => a + p.count, 0);
  const W = 720;
  const H = 160;
  const padBottom = 18;
  const gap = 2;
  const n = points.length;
  const barW = (W - gap * (n - 1)) / n;
  // Thin axis labels to ~12 ticks max.
  const labelEvery = Math.max(1, Math.ceil(n / 12));

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Події за {unitLabel}
        </span>
        <span className="text-xs text-muted tabular-nums">
          Всього: {total} · макс/інтервал: {max}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-40 w-full"
        role="img"
        aria-label={`Події за ${unitLabel}: всього ${total}`}
        preserveAspectRatio="none"
      >
        {points.map((p, i) => {
          const h = max > 0 ? ((H - padBottom) * p.count) / max : 0;
          const x = i * (barW + gap);
          const y = H - padBottom - h;
          return (
            <g key={`${p.label}-${i}`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(0, h)}
                rx={1}
                className="fill-green-deep/70"
              >
                <title>{`${p.label}: ${p.count}`}</title>
              </rect>
              {i % labelEvery === 0 && (
                <text
                  x={x + barW / 2}
                  y={H - 5}
                  textAnchor="middle"
                  className="fill-muted"
                  style={{ fontSize: 9 }}
                >
                  {p.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** A funnel as stacked proportional bars with conversion percentages. */
export function FunnelBars({
  steps,
}: {
  steps: {
    key: string;
    label: string;
    count: number;
    rateFromTop: number;
    rateFromPrev: number;
  }[];
}) {
  if (steps.length === 0 || steps.every((s) => s.count === 0)) {
    return <p className="text-sm text-muted">Поки що недостатньо даних для воронки.</p>;
  }
  return (
    <ul className="space-y-3">
      {steps.map((s, i) => {
        const widthPct = Math.max(3, Math.round(s.rateFromTop * 100));
        return (
          <li key={s.key}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-ink">
                {i + 1}. {s.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted">
                <span className="font-semibold text-ink">{s.count}</span>
                {i > 0 && (
                  <>
                    {" "}
                    · {Math.round(s.rateFromTop * 100)}% від старту · {Math.round(
                      s.rateFromPrev * 100,
                    )}
                    % від попер.
                  </>
                )}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-md bg-field">
              <div
                className="h-full rounded-md bg-green-deep/60"
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
