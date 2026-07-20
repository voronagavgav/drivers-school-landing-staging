import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { GET } from "@/app/api/q-image/[key]/route";

// Integration coverage for the /api/q-image/[key] route. The handler reads the real
// `public/` tree at process.cwd(), so this drives the exported `GET` directly against
// throwaway tier files and asserts the spec's behaviours:
//  - a safe key present only in the original tier serves the original (200, image/png);
//  - adding an override-tier file for that key makes the route serve the override (precedence);
//  - an unknown/garbage key and path-traversal attempts return 404 (never read outside public/).
// It only creates/removes files under a unique throwaway key, leaving tracked images untouched.

const PUBLIC = path.join(process.cwd(), "public");
const KEY = `itest_qimg_${Date.now()}`;
const ORIGINAL = path.join(PUBLIC, "official-images", `${KEY}.png`);
const OVERRIDE = path.join(PUBLIC, "image-overrides", `${KEY}.png`);
const ORIGINAL_BYTES = Buffer.from("ORIGINAL-PNG-DATA");
const OVERRIDE_BYTES = Buffer.from("OVERRIDE-PNG-DATA");

// Build a NextRequest and the Next 16 async-params shape, then call the handler.
function call(key: string): Promise<Response> {
  const req = new NextRequest(`http://localhost/api/q-image/${encodeURIComponent(key)}`);
  return GET(req, { params: Promise.resolve({ key }) });
}

beforeAll(() => {
  mkdirSync(path.dirname(ORIGINAL), { recursive: true });
  writeFileSync(ORIGINAL, ORIGINAL_BYTES);
});

afterAll(() => {
  // Remove ONLY our throwaway files — never the tracked/imported images or the tier dirs.
  for (const f of [ORIGINAL, OVERRIDE]) if (existsSync(f)) rmSync(f);
});

describe("GET /api/q-image/[key]", () => {
  it("serves the original image (200, image/png, cached) for a safe key only in the original tier", async () => {
    const res = await call(KEY);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    // Cached but NOT immutable — an override can change a key's image.
    expect(res.headers.get("cache-control")).toMatch(/max-age=3600/);
    expect(res.headers.get("cache-control")).not.toMatch(/immutable/);
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.equals(ORIGINAL_BYTES)).toBe(true);
  });

  it("serves the override once an override-tier file is added (precedence honoured)", async () => {
    mkdirSync(path.dirname(OVERRIDE), { recursive: true });
    writeFileSync(OVERRIDE, OVERRIDE_BYTES);
    const res = await call(KEY);
    expect(res.status).toBe(200);
    const body = Buffer.from(await res.arrayBuffer());
    expect(body.equals(OVERRIDE_BYTES)).toBe(true);
    expect(body.equals(ORIGINAL_BYTES)).toBe(false);
  });

  it("returns 404 for an unknown key and for path-traversal attempts (never reads outside public/)", async () => {
    expect((await call("no_such_key_zzz")).status).toBe(404);
    // Traversal attempts, encoded and raw: the pure sanitiser rejects '/', '.', '%' so
    // no candidate path is ever built — the handler returns 404 without any fs escape.
    for (const bad of ["..%2fofficial-images%2fanything", "../../package.json", "..", "a/../b"]) {
      expect((await call(bad)).status).toBe(404);
    }
  });
});
