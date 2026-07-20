import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  imageCandidatePaths,
  type ImageVariantFormat,
  type ImageVariantWidth,
} from "@/lib/image-resolve";

// ---------------------------------------------------------------------------
// SERVER image resolver (spec B, disk part). The pure `imageCandidatePaths`
// turns a key into ordered, sanitised, root-relative candidates under `public/`;
// this module is the ONLY place that touches the filesystem to pick the first
// one that actually exists. fs/path live here, never in `lib/image-resolve.ts`.
// ---------------------------------------------------------------------------

// The static asset root. Candidates are joined against this; nothing outside it
// is ever read (defense-in-depth — the pure sanitiser already rejects traversal).
const PUBLIC_DIR = path.join(process.cwd(), "public");

/**
 * Resolve an image `key` to the absolute on-disk path of the first existing
 * candidate (override tier wins over restyled-live wins over original), or
 * `null` if the key is unsafe or no candidate exists.
 *
 * A garbage/traversal key yields no candidates from `imageCandidatePaths`, so it
 * returns `null` without any fs access. As a second, independent guard, each
 * resolved path is re-checked to stay strictly within `PUBLIC_DIR` before it is
 * considered — so even a future candidate-builder bug cannot escape `public/`.
 */
export function resolveImageDiskPath(key: string): string | null {
  for (const candidate of imageCandidatePaths(key)) {
    const abs = path.resolve(PUBLIC_DIR, candidate);
    // Containment re-check: the resolved path must be inside PUBLIC_DIR.
    if (abs !== PUBLIC_DIR && !abs.startsWith(PUBLIC_DIR + path.sep)) continue;
    if (existsSync(abs)) return abs;
  }
  return null;
}

// Where the wave13-04 prebake emits its width/format variants.
const VARIANT_DIR = "img-cache";

/**
 * Resolve a prebaked variant (`public/img-cache/<key>-<width>.<format>`) to its
 * absolute on-disk path, or `null` when it doesn't exist. Width/format are
 * whitelist-typed (negotiated upstream), but the resolved path still gets the
 * same PUBLIC_DIR containment re-check as the base resolver — a hostile `key`
 * cannot steer the read outside `public/`.
 */
export function resolveVariantDiskPath(
  key: string,
  width: ImageVariantWidth,
  format: ImageVariantFormat,
): string | null {
  const abs = path.resolve(PUBLIC_DIR, VARIANT_DIR, `${key}-${width}.${format}`);
  if (abs !== PUBLIC_DIR && !abs.startsWith(PUBLIC_DIR + path.sep)) return null;
  if (!existsSync(abs)) return null;
  return abs;
}
