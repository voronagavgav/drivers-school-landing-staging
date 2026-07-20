// ---------------------------------------------------------------------------
// Presentational pieces for the content-health table. PLAIN props only — no DB,
// no server module imports — so these stay decoupled and typecheck before the
// page (task 06) wires `getContentHealth()` rows onto them.
//
// a11y/Ukrainian: never signal by colour alone. Every option shows its numeric
// pick rate as text and the keyed-correct option carries a text/symbol cue;
// every flag always renders its Ukrainian label text.
// ---------------------------------------------------------------------------

import { Badge, cx } from "@/components/ui";

/** One option's pick breakdown — structurally compatible with `OptionStat`. */
export interface OptionDistributionItem {
  optionKey: string;
  picks: number;
  isCorrect: boolean;
  pickRate: number; // 0..1
}

/**
 * Horizontal pick-rate bars, one per option. Bar length reflects `pickRate`;
 * the keyed-correct option is marked with colour AND a "✓ ключ" text cue, and
 * each row prints its pick count and rounded rate as text (not colour-only).
 */
export function OptionDistribution({ options }: { options: OptionDistributionItem[] }) {
  if (options.length === 0) {
    return <p className="text-xs text-muted">Немає відповідей</p>;
  }
  return (
    <ul className="space-y-1.5">
      {options.map((o) => {
        const pct = Math.round(o.pickRate * 100);
        return (
          <li key={o.optionKey} className="flex items-center gap-2">
            <span
              className={cx(
                "w-6 shrink-0 text-xs font-semibold uppercase",
                o.isCorrect ? "text-green-deep" : "text-muted",
              )}
            >
              {o.optionKey}
            </span>
            <div className="relative h-4 flex-1 overflow-hidden rounded bg-field">
              <div
                className={cx("h-full rounded", o.isCorrect ? "bg-green-deep" : "bg-green-deep/60")}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="flex w-28 shrink-0 items-center justify-end gap-1 text-right text-xs tabular-nums text-muted">
              <span>
                {o.picks} · {pct}%
              </span>
              {o.isCorrect && (
                <span
                  className="font-semibold text-green-deep"
                  aria-label="ключова правильна відповідь"
                >
                  ✓ ключ
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** One quality flag — structurally compatible with `ContentFlag`. */
export interface FlagBadgeItem {
  kind: string;
  label: string;
}

/** Tone per flag kind; unknown kinds fall back to neutral. */
const FLAG_TONE: Record<string, "neutral" | "danger" | "lane"> = {
  WRONG_KEY_SUSPECTED: "danger",
  LOW_DISCRIMINATION: "lane",
  INSUFFICIENT_DATA: "neutral",
};

/**
 * A quality flag rendered as a `Badge`. The Ukrainian `label` text is always
 * shown (the colour only reinforces it), so the meaning never depends on hue.
 */
export function FlagBadge({ flag }: { flag: FlagBadgeItem }) {
  return <Badge tone={FLAG_TONE[flag.kind] ?? "neutral"}>{flag.label}</Badge>;
}
