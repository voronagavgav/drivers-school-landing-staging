// ---------------------------------------------------------------------------
// PURE image candidate-path resolver (spec B, pure part). No I/O, no database
// client, no server-runtime-only modules — safe to import from both the render
// path and unit tests, so it MUST stay runtime-agnostic. It returns CANDIDATE
// paths relative to `public/`; the server resolver (a later task) decides which
// candidate actually exists on disk.
// ---------------------------------------------------------------------------

import { safeImageUrl } from "@/lib/sanitize";

// Tier directories under `public/`, in PRECEDENCE order: a hand-placed override
// wins over a restyled-live image, which wins over the original import. Exported
// so the server resolver and importer reuse the exact same dir names.
export const IMAGE_OVERRIDE_DIR = "image-overrides";
export const RESTYLED_LIVE_DIR = "restyled-live";
export const ORIGINAL_IMAGE_DIR = "official-images";

// Tiers in precedence order — first match wins downstream.
export const IMAGE_TIER_DIRS = [
  IMAGE_OVERRIDE_DIR,
  RESTYLED_LIVE_DIR,
  ORIGINAL_IMAGE_DIR,
] as const;

// Extensions tried within EACH tier, in this order. An override `.png` therefore
// precedes any restyled-live path, and all restyled-live precede any original.
export const IMAGE_EXTENSIONS = [".png", ".jpeg", ".jpg", ".svg"] as const;

// A key is a stable basename-without-extension (e.g. "11_10_0"). Sanitisation is
// a SECURITY boundary against path traversal: we REJECT anything outside the safe
// alphabet rather than sanitise-and-continue. The `[A-Za-z0-9_-]+` class already
// excludes the empty string, the slash and backslash separators, the dot (so a
// leading-dot or doubled-dot key cannot pass), and percent-escapes.
const SAFE_KEY = /^[A-Za-z0-9_-]+$/;

/**
 * True when `key` is safe to interpolate into a candidate path — a non-empty
 * string of `[A-Za-z0-9_-]` only. Rejects every traversal and garbage form.
 */
export function isSafeKey(key: string): boolean {
  return typeof key === "string" && SAFE_KEY.test(key);
}

/**
 * Ordered candidate paths for an image `key`, root-relative under `public/`
 * (no leading slash, no `public/` prefix — e.g. "image-overrides/11_10_0.png").
 *
 * Precedence is tier-major, extension-minor: every extension of the override
 * tier, then every extension of restyled-live, then every extension of the
 * original tier. Returns `[]` for an unsafe/garbage key.
 */
export function imageCandidatePaths(key: string): string[] {
  if (!isSafeKey(key)) return [];
  const paths: string[] = [];
  for (const dir of IMAGE_TIER_DIRS) {
    for (const ext of IMAGE_EXTENSIONS) {
      paths.push(`${dir}/${key}${ext}`);
    }
  }
  return paths;
}

// Widths of the prebaked variants under `public/img-cache` (wave13-04). This is
// a WHITELIST: `?w=` values are matched against it exactly, never parsed into
// arbitrary resize targets. Exported so the server resolver and srcset builders
// reuse the same set.
export const IMAGE_VARIANT_WIDTHS = [360, 540, 720] as const;

export type ImageVariantWidth = (typeof IMAGE_VARIANT_WIDTHS)[number];
export type ImageVariantFormat = "avif" | "webp";

export interface ImageVariant {
  width: ImageVariantWidth;
  format: ImageVariantFormat;
}

/**
 * Content negotiation for the `/api/q-image/<key>` route (spec §C): decides
 * whether a prebaked variant may be served instead of the original.
 *
 * Rules (all must hold, else `null` → the caller serves the original):
 *  - `w` must be present and match one of `IMAGE_VARIANT_WIDTHS` exactly;
 *  - `accept` must EXPLICITLY name `image/avif` or `image/webp` — a bare
 *    wildcard (star-slash-star) is not enough; avif wins when both are present.
 *
 * Accept parsing is deliberate token containment (`includes("image/avif")`),
 * NOT full RFC-9110 q-value parsing: real browsers that support a format list
 * it verbatim, and `q=0` edge cases are ignored as out of scope.
 */
export function negotiateImageVariant(
  accept: string | null,
  w: string | null,
): ImageVariant | null {
  if (accept == null || w == null) return null;
  const width = IMAGE_VARIANT_WIDTHS.find((v) => String(v) === w);
  if (width === undefined) return null;
  if (accept.includes("image/avif")) return { width, format: "avif" };
  if (accept.includes("image/webp")) return { width, format: "webp" };
  return null;
}

/**
 * `srcset` value for a question image `key` (spec §C): one entry per prebaked
 * variant width, in ascending `IMAGE_VARIANT_WIDTHS` order —
 * `"/api/q-image/<key>?w=360 360w, …540 540w, …720 720w"`. Returns `null` for
 * an unsafe key (same boundary as `isSafeKey` — never interpolate a rejected
 * key into a URL). The `?w=` URLs degrade gracefully: until the route's
 * negotiation is live they fall through to the original image.
 */
export function imageSrcSet(key: string): string | null {
  if (!isSafeKey(key)) return null;
  return IMAGE_VARIANT_WIDTHS.map((w) => `/api/q-image/${key}?w=${w} ${w}w`).join(", ");
}

/** Minimal image-bearing shape a question exposes to the render layer. */
export interface ImageRef {
  imageKey?: string | null;
  imageUrl?: string | null;
}

/**
 * Resolves the `<img>` src a question should render, in precedence order:
 *  1. an `imageKey` (a stable basename) → the tier-aware route `/api/q-image/<key>`,
 *     which the server resolver maps to override ▸ restyled-live ▸ original on disk;
 *  2. else a freeform `imageUrl` that passes `safeImageUrl` → that safe URL;
 *  3. else `null` (no image, or an unsafe url with no key).
 *
 * Stays PURE: `safeImageUrl` (`@/lib/sanitize`) is itself pure, so this is safe to
 * import from both the render path and unit tests. The `/api/q-image` route does its
 * own key sanitisation, so an unknown/garbage key simply 404s rather than rendering.
 */
export function resolveImageSrc(question: ImageRef): string | null {
  if (question.imageKey) {
    return `/api/q-image/${question.imageKey}`;
  }
  return safeImageUrl(question.imageUrl);
}
