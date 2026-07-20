// ---------------------------------------------------------------------------
// PURE image-URL sanitiser (spec section C core). No I/O, no database client,
// no server-runtime-only modules — safe to import from both the render path
// (wiring task 08) and unit tests, so it MUST stay runtime-agnostic.
// ---------------------------------------------------------------------------

/**
 * Returns the URL string when it is safe to use as an <img> src, otherwise `null`:
 *  - an absolute `http:`/`https:` URL, or
 *  - a same-origin ROOT-RELATIVE path (`/official-images/x.png`) — used for locally
 *    hosted official question images under `public/`.
 *
 * Everything else is rejected: `javascript:`/`data:`/`file:` schemes, protocol-relative
 * `//host` (could load cross-origin), and backslash tricks (`/\host`) that some browsers
 * normalise to a host. Root-relative paths can't carry a scheme, so they can't XSS.
 */
export function safeImageUrl(url: string | null | undefined): string | null {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (trimmed === "") return null;
  // same-origin root-relative path: leading single "/", not "//" and not "/\"
  if (trimmed.startsWith("/") && trimmed[1] !== "/" && trimmed[1] !== "\\") return trimmed;
  try {
    const protocol = new URL(trimmed).protocol.toLowerCase();
    if (protocol === "http:" || protocol === "https:") return trimmed;
    return null;
  } catch {
    return null;
  }
}
