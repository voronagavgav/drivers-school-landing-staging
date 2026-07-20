import { describe, it, expect } from "vitest";
import {
  imageCandidatePaths,
  imageSrcSet,
  isSafeKey,
  negotiateImageVariant,
  resolveImageSrc,
  IMAGE_OVERRIDE_DIR,
  RESTYLED_LIVE_DIR,
  ORIGINAL_IMAGE_DIR,
  IMAGE_EXTENSIONS,
  IMAGE_VARIANT_WIDTHS,
} from "@/lib/image-resolve";

describe("image-resolve.imageCandidatePaths (precedence)", () => {
  it("orders tiers override ▸ restyled-live ▸ original", () => {
    const paths = imageCandidatePaths("11_10_0");
    const firstOverride = paths.findIndex((p) => p.startsWith(`${IMAGE_OVERRIDE_DIR}/`));
    const lastOverride = paths.map((p) => p.startsWith(`${IMAGE_OVERRIDE_DIR}/`)).lastIndexOf(true);
    const firstRestyled = paths.findIndex((p) => p.startsWith(`${RESTYLED_LIVE_DIR}/`));
    const lastRestyled = paths.map((p) => p.startsWith(`${RESTYLED_LIVE_DIR}/`)).lastIndexOf(true);
    const firstOriginal = paths.findIndex((p) => p.startsWith(`${ORIGINAL_IMAGE_DIR}/`));

    // every override path precedes every restyled-live path, which precedes every original path
    expect(firstOverride).toBe(0);
    expect(lastOverride).toBeLessThan(firstRestyled);
    expect(lastRestyled).toBeLessThan(firstOriginal);
  });

  it("puts the override .png ahead of any restyled-live path", () => {
    const paths = imageCandidatePaths("11_10_0");
    const overridePng = paths.indexOf(`${IMAGE_OVERRIDE_DIR}/11_10_0.png`);
    const firstRestyled = paths.findIndex((p) => p.startsWith(`${RESTYLED_LIVE_DIR}/`));
    expect(overridePng).toBe(0);
    expect(overridePng).toBeLessThan(firstRestyled);
  });

  it("returns root-relative paths under public/ (no leading slash, no public/ prefix)", () => {
    for (const p of imageCandidatePaths("11_10_0")) {
      expect(p.startsWith("/")).toBe(false);
      expect(p.startsWith("public/")).toBe(false);
    }
  });
});

describe("image-resolve.imageCandidatePaths (extensions)", () => {
  it("emits all four extension variants in order within each tier", () => {
    const paths = imageCandidatePaths("11_10_0");
    for (const dir of [IMAGE_OVERRIDE_DIR, RESTYLED_LIVE_DIR, ORIGINAL_IMAGE_DIR]) {
      const tier = paths.filter((p) => p.startsWith(`${dir}/`));
      expect(tier).toEqual(IMAGE_EXTENSIONS.map((ext) => `${dir}/11_10_0${ext}`));
    }
  });

  it("returns exactly tiers × extensions candidates", () => {
    const paths = imageCandidatePaths("11_10_0");
    expect(paths).toHaveLength(3 * IMAGE_EXTENSIONS.length);
  });
});

describe("image-resolve.imageCandidatePaths (rejects unsafe keys)", () => {
  it.each([
    ["empty string", ""],
    ["forward slash", "a/b"],
    ["percent-encoded traversal", "..%2f"],
    ["doubled dot", ".."],
    ["backslash", "a\\b"],
    ["leading dot", ".hidden"],
  ])("returns [] for %s", (_label, key) => {
    expect(imageCandidatePaths(key)).toEqual([]);
  });
});

describe("image-resolve.isSafeKey", () => {
  it("accepts a normal basename key", () => {
    expect(isSafeKey("11_10_0")).toBe(true);
    expect(isSafeKey("a-b_C9")).toBe(true);
  });
  it.each(["", "a/b", "..%2f", "..", "a\\b", ".hidden"])(
    "rejects unsafe key %j",
    (key) => {
      expect(isSafeKey(key)).toBe(false);
    },
  );
});

describe("image-resolve.resolveImageSrc (branches)", () => {
  it("imageKey present → the tier-aware /api/q-image/<key> route (wins over a url)", () => {
    expect(resolveImageSrc({ imageKey: "11_10_0" })).toBe("/api/q-image/11_10_0");
    // a present key takes precedence even when a url is also set
    expect(
      resolveImageSrc({ imageKey: "11_10_0", imageUrl: "/official-images/11_10_0.png" }),
    ).toBe("/api/q-image/11_10_0");
  });

  it("no key but a safe imageUrl → that url", () => {
    expect(resolveImageSrc({ imageUrl: "/official-images/11_10_0.png" })).toBe(
      "/official-images/11_10_0.png",
    );
    expect(resolveImageSrc({ imageKey: null, imageUrl: "https://cdn.example/x.png" })).toBe(
      "https://cdn.example/x.png",
    );
  });

  it("neither key nor url → null", () => {
    expect(resolveImageSrc({})).toBeNull();
    expect(resolveImageSrc({ imageKey: null, imageUrl: null })).toBeNull();
    expect(resolveImageSrc({ imageKey: "", imageUrl: undefined })).toBeNull();
  });

  it("no key + an UNSAFE imageUrl → null (does not weaken safeImageUrl)", () => {
    expect(resolveImageSrc({ imageUrl: "javascript:alert(1)" })).toBeNull();
    expect(resolveImageSrc({ imageUrl: "//evil.example/x.png" })).toBeNull();
  });
});

// The srcset literal below is a FROZEN oracle value, hand-computed from spec §C
// at plan time (task wave13-08). Do not derive it from the implementation.
describe("image-resolve.imageSrcSet (frozen oracle)", () => {
  it("emits the exact three-variant srcset for a safe key", () => {
    expect(imageSrcSet("11_10_0")).toBe(
      "/api/q-image/11_10_0?w=360 360w, /api/q-image/11_10_0?w=540 540w, /api/q-image/11_10_0?w=720 720w",
    );
  });

  it("returns null for an unsafe key", () => {
    expect(imageSrcSet("../etc")).toBeNull();
  });
});

describe("image-resolve.IMAGE_VARIANT_WIDTHS", () => {
  it("is exactly the prebaked width whitelist", () => {
    expect(IMAGE_VARIANT_WIDTHS).toEqual([360, 540, 720]);
  });
});

// The eight vectors below are FROZEN oracle values, hand-computed from the
// negotiation rules at plan time (task wave13-06). Do not derive them from the
// implementation.
describe("image-resolve.negotiateImageVariant (frozen oracle vectors)", () => {
  it("avif wins when both avif and webp are accepted", () => {
    expect(
      negotiateImageVariant("image/avif,image/webp,image/*,*/*;q=0.8", "540"),
    ).toEqual({ width: 540, format: "avif" });
  });

  it("falls back to webp when avif is absent", () => {
    expect(
      negotiateImageVariant("image/webp,image/apng,image/*,*/*;q=0.8", "540"),
    ).toEqual({ width: 540, format: "webp" });
  });

  it("*/* alone is NOT explicit avif/webp support → original", () => {
    expect(negotiateImageVariant("*/*", "540")).toBeNull();
  });

  it("null Accept header → original", () => {
    expect(negotiateImageVariant(null, "540")).toBeNull();
  });

  it("width outside the whitelist → original", () => {
    expect(negotiateImageVariant("image/avif", "541")).toBeNull();
  });

  it("no w param → original (unchanged behavior)", () => {
    expect(negotiateImageVariant("image/avif", null)).toBeNull();
  });

  it("smallest whitelisted width negotiates", () => {
    expect(negotiateImageVariant("image/avif,image/webp", "360")).toEqual({
      width: 360,
      format: "avif",
    });
  });

  it("largest whitelisted width negotiates via webp", () => {
    expect(negotiateImageVariant("text/html,image/webp", "720")).toEqual({
      width: 720,
      format: "webp",
    });
  });
});
