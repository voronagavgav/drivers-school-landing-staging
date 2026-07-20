/**
 * Pure glass-tier resolver — Wave-12a design-system §B / `04-design-system.md` §5.
 *
 * The app's glass model has three surfaces: real frost (opt-UP, GPU backdrop-filter),
 * emulated (painted fill + rim + gloss, the SAFE default for weak phones), and solid
 * (opaque reading surface, forced by accessibility prefs). The DECISION of which tier
 * a client should get is captured here as a PURE function so it is deterministic and
 * unit-testable: all browser/DOM signals are INJECTED by the shell (task 05), never
 * read here. See §5 for the precedence table this reproduces.
 */

export type GlassTier = "real" | "emulated" | "solid";

export type GlassSignals = {
  /** UserSettings.glassTier — explicit user choice, or "auto" to let capability decide. */
  override: "auto" | "real" | "emulated" | "solid";
  /** GB (device memory; shell defaults to 4 when unknown). */
  deviceMemory: number;
  /** logical cores (shell defaults to 4 when unknown). */
  hardwareConcurrency: number;
  /** pointer:fine media query — a precise pointer (mouse/trackpad). */
  pointerFine: boolean;
  /** connection.saveData — user asked for reduced data. */
  saveData: boolean;
  /** prefers-reduced-motion: reduce. */
  reducedMotion: boolean;
  /** prefers-reduced-transparency: reduce. */
  reducedTransparency: boolean;
  /** prefers-contrast: more. */
  contrastMore: boolean;
  /** viewport width in px (phone when ≤ 760). */
  viewportWidth: number;
};

/** Viewport at or below this width is treated as a phone (excluded from real frost). */
const PHONE_MAX_WIDTH = 760;

/**
 * Resolve the glass tier from injected signals, per the §5 precedence:
 *   1. accessibility (reduced transparency / more contrast) → "solid" (beats even an explicit real override)
 *   2. override "solid" → "solid"
 *   3. override "emulated" → "emulated"
 *   4. override "real" → "real" (explicit opt-up forces real even on weak signals)
 *   5. override "auto" → "real" iff ALL capability + environment signals are strong; else "emulated"
 */
export function resolveGlassTier(signals: GlassSignals): GlassTier {
  // 1. Accessibility overrides win over everything, including an explicit "real".
  if (signals.reducedTransparency || signals.contrastMore) return "solid";

  // 2–4. Explicit user overrides.
  if (signals.override === "solid") return "solid";
  if (signals.override === "emulated") return "emulated";
  if (signals.override === "real") return "real";

  // 5. Auto: real only when every capability + environment signal is strong.
  const strong =
    signals.deviceMemory >= 8 &&
    signals.hardwareConcurrency >= 8 &&
    signals.pointerFine &&
    !signals.saveData &&
    !signals.reducedMotion &&
    signals.viewportWidth > PHONE_MAX_WIDTH;

  return strong ? "real" : "emulated";
}
