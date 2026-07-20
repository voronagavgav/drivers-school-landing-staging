import { describe, it, expect } from "vitest";
import { safeImageUrl } from "@/lib/sanitize";

describe("sanitize.safeImageUrl (accepts)", () => {
  it("accepts and returns an http URL unchanged", () => {
    expect(safeImageUrl("http://example.com/a.png")).toBe("http://example.com/a.png");
  });
  it("accepts and returns an https URL unchanged", () => {
    expect(safeImageUrl("https://example.com/a.png")).toBe("https://example.com/a.png");
  });
  it("accepts an uppercase scheme", () => {
    expect(safeImageUrl("HTTPS://example.com/a.png")).not.toBeNull();
  });
  it("trims surrounding whitespace before returning", () => {
    expect(safeImageUrl("  https://example.com/a.png  ")).toBe("https://example.com/a.png");
  });
  it("accepts a same-origin root-relative path (locally hosted images)", () => {
    expect(safeImageUrl("/official-images/33_1.png")).toBe("/official-images/33_1.png");
  });
});

describe("sanitize.safeImageUrl (rejects)", () => {
  it("rejects null", () => {
    expect(safeImageUrl(null)).toBeNull();
  });
  it("rejects undefined", () => {
    expect(safeImageUrl(undefined)).toBeNull();
  });
  it("rejects an empty string", () => {
    expect(safeImageUrl("")).toBeNull();
  });
  it("rejects a whitespace-only string", () => {
    expect(safeImageUrl("   ")).toBeNull();
  });
  it("rejects a javascript: URL", () => {
    expect(safeImageUrl("javascript:alert(1)")).toBeNull();
  });
  it("rejects a data: URL", () => {
    expect(safeImageUrl("data:text/html;base64,xxx")).toBeNull();
  });
  it("rejects a file: URL", () => {
    expect(safeImageUrl("file:///etc/passwd")).toBeNull();
  });
  it("rejects a protocol-relative URL", () => {
    expect(safeImageUrl("//evil.com/x.png")).toBeNull();
  });
  it("rejects a backslash host trick", () => {
    expect(safeImageUrl("/\\evil.com/x.png")).toBeNull();
  });
  it("rejects a bare relative path (no leading slash)", () => {
    expect(safeImageUrl("img/x.png")).toBeNull();
  });
});
