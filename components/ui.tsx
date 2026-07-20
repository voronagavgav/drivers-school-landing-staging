import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// ---- Buttons ----
// Blueprint controls use 8px corners. Pills remain reserved for badges and progress states.
// Min 44px targets and the global :focus-visible ring cover every button variant.
const BTN_BASE =
  "inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-3 text-sm font-semibold transition-[transform,background-color,box-shadow,opacity] disabled:opacity-50 disabled:pointer-events-none";
const BTN_VARIANTS: Record<string, string> = {
  primary: "rounded-card bg-green-soft text-green-ink hover:brightness-[.97] active:scale-[.985]",
  secondary: "rounded-card bg-green-deep text-[var(--color-text-on-dark)] hover:-translate-y-px",
  danger: "rounded-card bg-[var(--no-fill)] text-[var(--no-ink)] hover:opacity-90",
  ghost: "rounded-card text-green-deep hover:bg-green-soft/25",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: { variant?: keyof typeof BTN_VARIANTS } & ComponentProps<"button">) {
  return <button className={cx(BTN_BASE, BTN_VARIANTS[variant], className)} {...props} />;
}

export function LinkButton({
  variant = "primary",
  className,
  href,
  children,
}: {
  variant?: keyof typeof BTN_VARIANTS;
  className?: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cx(BTN_BASE, BTN_VARIANTS[variant], className)}>
      {children}
    </Link>
  );
}

// ---- Surfaces ----
// Reading surface = OPAQUE at every tier (taste law): `.solid` paints a token fill,
// hairline `border-line`, and the `--float` shadow — never glass, never backdrop-filter.
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("solid p-5", className)}>{children}</div>;
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-ink">
        {children}
      </h2>
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "go" | "danger" | "lane" | "sign";
}) {
  // Token tones (spec §C): success = mint/soft-green fill + dark ink; wrong = peach + dark ink;
  // amber for attention; neutral hairline. Never white-on-tint (dark-ink taste law).
  const tones: Record<string, string> = {
    neutral: "bg-field text-muted border-line",
    go: "bg-[var(--ok-fill)] text-[var(--ok-ink)] border-green-deep/25",
    danger: "bg-[var(--no-fill)] text-[var(--no-ink)] border-warn/30",
    lane: "bg-amber/10 text-amber border-amber/30",
    sign: "bg-green-soft/30 text-green-deep border-green-deep/25",
  };
  return (
    <span className={cx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

/** "Demo content" label — required wherever demo questions surface. */
export function DemoBadge() {
  return <Badge tone="lane">Демо-контент</Badge>;
}

/**
 * Orientational label for an explanation that has NOT been independently reviewed.
 * Auto-generated explanations are orientational study aids — never authoritative — so any
 * explanation whose reviewedStatus !== "REVIEWED" must carry this notice. Render it next to
 * the explanation text; pass the explanation's reviewedStatus and it shows only when needed.
 */
export function ExplanationNotice({ reviewedStatus }: { reviewedStatus?: string | null }) {
  if (reviewedStatus === "REVIEWED") return null;
  return (
    <p className="mt-2 text-xs italic text-muted">
      Пояснення згенеровано автоматично — орієнтовне, звіряйтеся з чинними ПДР.
    </p>
  );
}

// ---- Form field ----
// `error` is the client-validation slot (Ukrainian message from useUkValidation):
// it renders as a role="alert" element tied to the input via aria-describedby.
export function Field({
  label,
  name,
  type = "text",
  required,
  minLength,
  defaultValue,
  placeholder,
  autoComplete,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
}) {
  const errorId = error ? `${name}-error` : undefined;
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base outline-none focus:border-green-deep sm:text-sm"
      />
      {error ? (
        <p role="alert" id={errorId} className="mt-1 text-sm text-warn">
          {error}
        </p>
      ) : null}
    </label>
  );
}

// ---- Signature: road progress ----
export function RoadProgress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="road" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="road-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-bold leading-none text-ink tabular-nums">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}
