import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GET } from "@/app/api/q-image/[key]/route";

// Integration coverage for the /api/q-image/[key] CONTENT NEGOTIATION (spec §C), through
// the real exported route handler — the same entry the browser hits. The wave13-06 unit
// tests pin the pure negotiator; this suite pins the TRANSPORT semantics: with `?w=` and
// an Accept naming avif/webp the route serves the prebaked `public/img-cache/` variant
// (200, image/<format>, long-lived immutable cache); any negotiation miss — no `w`, no
// format support, variant file absent — falls through to the original (image/png,
// short-lived NON-immutable cache, never a 404); the key regex + traversal guard is
// unchanged. Dummy variant bytes are legitimate here: the route types by extension, and
// encoder quality is wave13-04's gate, not this one.

const PUBLIC = path.join(process.cwd(), "public");

// Committed restyled-live key used as the negotiated-key subject. Its 540 variants may
// already exist as real bakes — beforeAll creates ONLY the absent ones (tiny dummy bytes)
// and afterAll removes ONLY those it created, never a real bake.
const KEY = "11_10_0";
const VARIANT_PATHS = (["avif", "webp"] as const).map((ext) =>
  path.join(PUBLIC, "img-cache", `${KEY}-540.${ext}`),
);
const createdVariants: string[] = [];

// Per-run key with NO img-cache variants: negotiation resolves but the variant file is
// absent, so the route must degrade gracefully to the original.
const NOVAR_KEY = `itnovar${Date.now()}`;
const NOVAR_PNG = path.join(PUBLIC, "restyled-live", `${NOVAR_KEY}.png`);

// Drive the exported handler exactly like the browser does: URL with optional `?w=`,
// Accept header, and the Next 16 async-params shape carrying the DECODED key.
function call(key: string, opts: { w?: string; accept?: string } = {}): Promise<Response> {
  const url = new URL(`http://localhost/api/q-image/${encodeURIComponent(key)}`);
  if (opts.w !== undefined) url.searchParams.set("w", opts.w);
  const req = new Request(url, {
    headers: opts.accept === undefined ? undefined : { accept: opts.accept },
  });
  return GET(req, { params: Promise.resolve({ key }) });
}

beforeAll(() => {
  mkdirSync(path.dirname(VARIANT_PATHS[0]), { recursive: true });
  for (const p of VARIANT_PATHS) {
    if (existsSync(p)) continue; // a real bake — leave it, and never delete it
    writeFileSync(p, Buffer.from(`DUMMY-VARIANT-${path.extname(p)}`));
    createdVariants.push(p);
  }
  copyFileSync(path.join(PUBLIC, "restyled-live", `${KEY}.png`), NOVAR_PNG);
});

afterAll(() => {
  for (const p of createdVariants) if (existsSync(p)) rmSync(p);
  if (existsSync(NOVAR_PNG)) rmSync(NOVAR_PNG);
});

describe("GET /api/q-image/[key] content negotiation", () => {
  it("serves the avif variant for an Accept that includes image/avif (immutable, long max-age)", async () => {
    const res = await call(KEY, { w: "540", accept: "image/avif,image/webp,*/*" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/avif");
    expect(res.headers.get("cache-control")).toMatch(/max-age=31536000/);
    expect(res.headers.get("cache-control")).toMatch(/immutable/);
  });

  it("serves the webp variant when Accept names webp but not avif", async () => {
    const res = await call(KEY, { w: "540", accept: "image/webp,*/*" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("cache-control")).toMatch(/immutable/);
  });

  it("serves the original png for Accept */* (cached, NOT immutable)", async () => {
    const res = await call(KEY, { w: "540", accept: "*/*" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(res.headers.get("cache-control")).not.toMatch(/immutable/);
  });

  it("serves the original when no `w` param is given, even for an avif Accept", async () => {
    const res = await call(KEY, { accept: "image/avif" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
  });

  it("degrades gracefully to the original when the negotiated variant file is absent (never 404)", async () => {
    const res = await call(NOVAR_KEY, { w: "540", accept: "image/avif,image/webp" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).not.toMatch(/immutable/);
  });

  it("keeps the traversal/garbage-key guard: 404 for unsafe keys", async () => {
    expect((await call("../../package.json", { w: "540", accept: "image/avif" })).status).toBe(404);
    expect((await call("garbage%2F..", { w: "540", accept: "image/avif" })).status).toBe(404);
  });
});
