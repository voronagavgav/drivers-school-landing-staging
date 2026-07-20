// ---------------------------------------------------------------------------
// PURE analytics-dashboard helpers. No DB, no server-only import — unit-testable.
// The server layer (lib/server/admin.ts → getAnalyticsDashboard) fetches rows with
// Prisma groupBy/count, then hands timestamps/labels here for bucketing, funnel math
// and range resolution. Keep this module pure (no Date.now() at module load, no DB)
// so the aggregation logic can be tested deterministically.
// ---------------------------------------------------------------------------

export const ANALYTICS_RANGES = ["24h", "7d", "30d", "90d"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export const DEFAULT_ANALYTICS_RANGE: AnalyticsRange = "30d";

/** Human label (Ukrainian) for each range, for the filter UI. */
export const RANGE_LABEL: Record<AnalyticsRange, string> = {
  "24h": "24 години",
  "7d": "7 днів",
  "30d": "30 днів",
  "90d": "90 днів",
};

const RANGE_MS: Record<AnalyticsRange, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

/** Coerce an untrusted query value to a valid range (defaults when unknown). */
export function parseRange(value: string | null | undefined): AnalyticsRange {
  return ANALYTICS_RANGES.includes(value as AnalyticsRange)
    ? (value as AnalyticsRange)
    : DEFAULT_ANALYTICS_RANGE;
}

/** Inclusive start `Date` for a range relative to `now` (the window is [start, now]). */
export function rangeStart(range: AnalyticsRange, now: number): Date {
  return new Date(now - RANGE_MS[range]);
}

/**
 * Whether the time-series is bucketed by hour (24h range) or by day (everything else).
 * Hourly for 24h keeps the bar count reasonable (24 bars) and informative.
 */
export function bucketUnit(range: AnalyticsRange): "hour" | "day" {
  return range === "24h" ? "hour" : "day";
}

/** UTC day key "YYYY-MM-DD" for a timestamp (stable, locale-independent bucket id). */
export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** UTC hour key "YYYY-MM-DDTHH" for a timestamp. */
export function hourKey(d: Date): string {
  return d.toISOString().slice(0, 13);
}

export interface TimeBucket {
  /** Bucket key (day or hour). */
  key: string;
  /** Start instant of the bucket. */
  start: Date;
  /** Short Ukrainian-locale label for the axis (e.g. "18.06" or "14:00"). */
  label: string;
  count: number;
}

/**
 * Build a CONTIGUOUS series of empty buckets spanning [start, now], so the chart shows
 * zero-days/hours rather than collapsing gaps. `unit` decides hourly vs daily. Returns
 * buckets oldest→newest. Pure: derives everything from the two instants + unit.
 */
export function buildEmptyBuckets(
  startMs: number,
  nowMs: number,
  unit: "hour" | "day",
): TimeBucket[] {
  const step = unit === "hour" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  // Snap the start down to the bucket boundary so labels line up cleanly.
  const startDate = new Date(startMs);
  const boundary =
    unit === "hour"
      ? Date.UTC(
          startDate.getUTCFullYear(),
          startDate.getUTCMonth(),
          startDate.getUTCDate(),
          startDate.getUTCHours(),
        )
      : Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());

  const buckets: TimeBucket[] = [];
  // Cap iterations defensively (a malformed range can't spin forever).
  const maxBuckets = unit === "hour" ? 24 * 4 : 366;
  for (let t = boundary, n = 0; t <= nowMs && n < maxBuckets; t += step, n++) {
    const start = new Date(t);
    buckets.push({
      key: unit === "hour" ? hourKey(start) : dayKey(start),
      start,
      label: unit === "hour" ? hourLabel(start) : dayLabel(start),
      count: 0,
    });
  }
  return buckets;
}

function dayLabel(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

function hourLabel(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, "0")}:00`;
}

/**
 * Fold a list of `{ at }` event timestamps into a contiguous bucket series for [start, now].
 * Out-of-range timestamps are ignored (defensive). Pure.
 */
export function bucketEventsOverTime(
  events: { at: Date }[],
  startMs: number,
  nowMs: number,
  unit: "hour" | "day",
): TimeBucket[] {
  const buckets = buildEmptyBuckets(startMs, nowMs, unit);
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const e of events) {
    const key = unit === "hour" ? hourKey(e.at) : dayKey(e.at);
    const i = index.get(key);
    if (i !== undefined) buckets[i].count += 1;
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// Funnel
// ---------------------------------------------------------------------------
export interface FunnelStep {
  key: string;
  label: string;
  count: number;
  /** Conversion from the FIRST step (0..1); the first step is 1. */
  rateFromTop: number;
  /** Conversion from the PREVIOUS step (0..1); the first step is 1. */
  rateFromPrev: number;
}

/**
 * Compute a register → onboarding → first-test → completion funnel from raw per-step
 * counts. Rates are clamped to [0,1] and guard divide-by-zero (a 0 top → all rates 0).
 * Steps are assumed already in funnel order. Pure.
 */
export function computeFunnel(steps: { key: string; label: string; count: number }[]): FunnelStep[] {
  const top = steps[0]?.count ?? 0;
  return steps.map((s, i) => {
    const prev = i === 0 ? s.count : steps[i - 1].count;
    return {
      ...s,
      rateFromTop: i === 0 ? 1 : top > 0 ? clamp01(s.count / top) : 0,
      rateFromPrev: i === 0 ? 1 : prev > 0 ? clamp01(s.count / prev) : 0,
    };
  });
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Pass rate as a fraction (0..1); 0 when there were no completed exams. Pure. */
export function passRate(passed: number, total: number): number {
  return total > 0 ? clamp01(passed / total) : 0;
}

/** Format a 0..1 fraction as a whole-percent string for the UI. */
export function formatPercent(fraction: number): string {
  return `${Math.round(clamp01(fraction) * 100)}%`;
}

/**
 * Chunk a list of ids into batches no larger than `size`, so a large `IN (...)` query
 * stays under the libsql bound-parameter limit. Pure.
 */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Normalize a referrer URL to its host (or a friendly bucket) for SEO breakdown. Pure. */
export function referrerHost(referrer: string | null | undefined): string {
  const r = referrer?.trim();
  if (!r) return "Прямі / без джерела";
  try {
    const host = new URL(r).host;
    return host || "Прямі / без джерела";
  } catch {
    // Not a full URL — fall back to the raw value, trimmed to something display-safe.
    return r.length > 64 ? `${r.slice(0, 61)}…` : r;
  }
}
