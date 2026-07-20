import { describe, it, expect } from "vitest";
import { resolveGlassTier, type GlassSignals } from "@/lib/glass-tier";

// FROZEN golden vectors from `04-design-system.md` §5 (the named external oracle).
// The base = a strong desktop under "auto" → "real"; each case overrides the base.
// Do NOT edit these expectations to match the implementation — they are the spec.
const base: GlassSignals = {
  override: "auto",
  deviceMemory: 16,
  hardwareConcurrency: 8,
  pointerFine: true,
  saveData: false,
  reducedMotion: false,
  reducedTransparency: false,
  contrastMore: false,
  viewportWidth: 1440,
};

const cases: ReadonlyArray<{ name: string; over: Partial<GlassSignals>; want: string }> = [
  { name: "base strong desktop", over: {}, want: "real" },
  { name: "too few cores", over: { hardwareConcurrency: 4 }, want: "emulated" },
  { name: "too little memory", over: { deviceMemory: 4 }, want: "emulated" },
  { name: "coarse pointer", over: { pointerFine: false }, want: "emulated" },
  { name: "save-data on", over: { saveData: true }, want: "emulated" },
  { name: "reduced motion", over: { reducedMotion: true }, want: "emulated" },
  { name: "phone width", over: { viewportWidth: 390 }, want: "emulated" },
  { name: "phone boundary (≤760)", over: { viewportWidth: 760 }, want: "emulated" },
  {
    name: "capability + phone boundaries just clear",
    over: { deviceMemory: 8, hardwareConcurrency: 8, viewportWidth: 761 },
    want: "real",
  },
  { name: "reduced transparency", over: { reducedTransparency: true }, want: "solid" },
  { name: "contrast more", over: { contrastMore: true }, want: "solid" },
  {
    name: "explicit real forces real on weak signals",
    over: { override: "real", deviceMemory: 4, hardwareConcurrency: 2, pointerFine: false, viewportWidth: 390 },
    want: "real",
  },
  {
    name: "a11y beats explicit real",
    over: { override: "real", reducedTransparency: true },
    want: "solid",
  },
  {
    name: "explicit emulated stays emulated on strong signals",
    over: { override: "emulated", deviceMemory: 16, hardwareConcurrency: 16, pointerFine: true },
    want: "emulated",
  },
  {
    name: "a11y beats explicit emulated",
    over: { override: "emulated", reducedTransparency: true },
    want: "solid",
  },
  {
    name: "explicit solid stays solid",
    over: { override: "solid", deviceMemory: 16, hardwareConcurrency: 16 },
    want: "solid",
  },
];

describe("resolveGlassTier", () => {
  for (const { name, over, want } of cases) {
    it(`${name} → "${want}"`, () => {
      expect(resolveGlassTier({ ...base, ...over })).toBe(want);
    });
  }
});
