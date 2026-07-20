import { readFile } from "node:fs/promises";
import path from "node:path";
import { negotiateImageVariant } from "@/lib/image-resolve";
import { resolveImageDiskPath, resolveVariantDiskPath } from "@/lib/server/image-resolve";

// Question-image route. Takes an UNTRUSTED `[key]` from the URL, resolves it to the
// best on-disk image (override > restyled-live > original) via `resolveImageDiskPath`,
// and serves the bytes. The pure sanitiser in `lib/image-resolve.ts` rejects every
// traversal/garbage key (no candidates → null → 404), and the resolver re-checks
// containment within `public/` — so this handler never reads outside that root.
//
// Content negotiation (spec §C): with `?w=<whitelisted width>` and an Accept header
// naming avif/webp, a prebaked `public/img-cache/` variant is served instead — but
// ONLY when the base key still resolves through the tier walk (a retired original
// never has its stale variants served). Any negotiation miss (no/invalid `w`, no
// format support, variant file absent) falls through to the original path unchanged;
// a missing variant never 404s a valid key.
//
// Node runtime: it touches the filesystem.

export const runtime = "nodejs";

// Content-Type by extension, covering exactly the tiers' allowed extensions
// (IMAGE_EXTENSIONS in lib/image-resolve.ts). Unknown → generic binary.
const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
): Promise<Response> {
  const { key } = await params;

  const diskPath = resolveImageDiskPath(key);
  if (!diskPath) {
    // Unknown key, no on-disk candidate, or a rejected traversal attempt.
    return new Response("Not found", { status: 404 });
  }

  // The base key resolves — try the negotiated prebaked variant first.
  const variant = negotiateImageVariant(
    req.headers.get("accept"),
    new URL(req.url).searchParams.get("w"),
  );
  if (variant) {
    const variantPath = resolveVariantDiskPath(key, variant.width, variant.format);
    if (variantPath) {
      try {
        const bytes = await readFile(variantPath);
        return new Response(new Uint8Array(bytes), {
          status: 200,
          headers: {
            "Content-Type": `image/${variant.format}`,
            // Variants are immutable by construction (fixed width/format baked from
            // the key's image). Asymmetry vs the original below: after an override
            // changes a key's image, a stale variant can be served until the next
            // prebake run refreshes it — accepted trade-off.
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      } catch {
        // Variant raced away — fall through to the original path.
      }
    }
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(diskPath);
  } catch {
    // Raced away between the existence check and the read.
    return new Response("Not found", { status: 404 });
  }

  const contentType =
    CONTENT_TYPES[path.extname(diskPath).toLowerCase()] ?? "application/octet-stream";

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      // Overrides can change a key's image, so cache but do NOT mark immutable.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
