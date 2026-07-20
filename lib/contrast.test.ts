import { describe, it, expect } from "vitest";
import { contrastRatio, relativeLuminance } from "@/lib/contrast";

// Oracle = WCAG 2.1 SC 1.4.3 (the NAMED external source). These expectations are
// FROZEN at plan time — do NOT edit them to match the implementation; the 21.0
// black/white anchor catches a wrong luminance formula immediately.
describe("contrastRatio — frozen WCAG anchors", () => {
  it("black on white = 21.0", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21.0, 1);
  });

  it("white on white = 1.0", () => {
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1.0, 2);
  });

  it("green-ink on green-soft (CTA pair) ≈ 7.62", () => {
    const ratio = contrastRatio("#173B30", "#9AD9B8");
    expect(ratio).toBeGreaterThan(7.0);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("relativeLuminance is order-of-magnitude sane (black=0, white≈1)", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
  });
});

// Design-system token pairs (values from `04-design-system.md` §1A / §7). Hexes are
// LITERALS here so a mis-copied token trips the ≥4.5:1 assertion. If a pair fails,
// the FIX is to darken the TEXT token (never harden the green fill), never to weaken
// this threshold.
const TOKEN_PAIRS: ReadonlyArray<{ name: string; text: string; fill: string }> = [
  { name: "CTA: green-ink / green-soft", text: "#173B30", fill: "#9AD9B8" },
  { name: "ink / card", text: "#1F2933", fill: "#FCFDFE" },
  { name: "ink / card-tint", text: "#1F2933", fill: "#F3F7F8" },
  { name: "ink / field", text: "#1F2933", fill: "#FBFAF7" },
  { name: "muted / card", text: "#46515D", fill: "#FCFDFE" },
  { name: "green-deep / card", text: "#226157", fill: "#FCFDFE" },
  { name: "amber / card", text: "#8A5E0E", fill: "#FCFDFE" },
  { name: "ok-ink / ok-fill (opaque bake)", text: "#0F3B2E", fill: "#DDF1E7" },
  { name: "no-ink / no-fill (opaque bake)", text: "#7D3A1F", fill: "#F6E2DA" },
];

describe("token pairs meet WCAG 4.5:1", () => {
  it.each(TOKEN_PAIRS)("$name — $text on $fill ≥ 4.5:1", ({ text, fill }) => {
    expect(contrastRatio(text, fill)).toBeGreaterThanOrEqual(4.5);
  });
});
