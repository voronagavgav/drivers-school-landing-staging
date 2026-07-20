/**
 * Pure WCAG 2.1 contrast helpers — Wave-12a a11y floor (§D / `04-design-system.md` §1A / §7).
 *
 * Implements the relative-luminance + contrast-ratio math from WCAG 2.1 Success
 * Criterion 1.4.3 (the NAMED external oracle) so the design-system token pairs can be
 * verified against the 4.5:1 minimum in a deterministic unit test. PURE: no DOM, no
 * clock, no randomness, no DB — just colour arithmetic on hex strings.
 *
 * Reference: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

/** Parse a `#RGB` or `#RRGGBB` hex colour to its three 8-bit channels [0..255]. */
function parseHex(hex: string): readonly [number, number, number] {
  const raw = hex.trim().replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : raw;
  if (full.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`Invalid hex colour: ${hex}`);
  }
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [r, g, b];
}

/** Linearize one 8-bit sRGB channel per WCAG 2.1 SC 1.4.3. */
function linearize(c8: number): number {
  const c = c8 / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * Relative luminance L of a hex colour, per WCAG 2.1:
 *   L = 0.2126*R + 0.7152*G + 0.0722*B  (over linearized channels).
 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Contrast ratio between two hex colours, per WCAG 2.1:
 *   (Llight + 0.05) / (Ldark + 0.05), in the range [1, 21].
 * Order-independent.
 */
export function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}
