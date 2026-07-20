import { describe, it, expect, afterEach, vi } from "vitest";
import { publicOrigin, indexingEnabled, questionJsonLd, type SeoQuestion } from "@/lib/seo";

// Spec T5 (SEO half, wave16-14): the indexing gate reads `APP_ORIGIN` at call time, and the JSON-LD
// builder must NEVER emit `acceptedAnswer` in the un-revealed document (no-leak, wave16-13).

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("publicOrigin / indexingEnabled (Gate 0)", () => {
  it("indexing is OFF when APP_ORIGIN is unset", () => {
    vi.stubEnv("APP_ORIGIN", undefined as unknown as string);
    expect(publicOrigin()).toBeNull();
    expect(indexingEnabled()).toBe(false);
  });

  it("indexing is OFF when APP_ORIGIN is blank/whitespace", () => {
    vi.stubEnv("APP_ORIGIN", "   ");
    expect(publicOrigin()).toBeNull();
    expect(indexingEnabled()).toBe(false);
  });

  it("indexing is ON for a real origin, returned trimmed", () => {
    vi.stubEnv("APP_ORIGIN", "  https://example.com  ");
    expect(publicOrigin()).toBe("https://example.com");
    expect(indexingEnabled()).toBe(true);
  });
});

describe("questionJsonLd", () => {
  const q: SeoQuestion = {
    text: "Що означає цей знак?",
    options: [
      { text: "Заборонено рух", isCorrect: false },
      { text: "Головна дорога", isCorrect: true },
      { text: "Дати дорогу", isCorrect: false },
    ],
  };

  it("un-revealed: Quiz shape with suggestedAnswer entries and NO acceptedAnswer key anywhere", () => {
    const ld = questionJsonLd(q, false);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("Quiz");
    const part = (ld.hasPart as Record<string, unknown>[])[0];
    expect(part["@type"]).toBe("Question");
    expect(part.suggestedAnswer).toHaveLength(3);
    // The literal serialized document must not contain the answer key at all.
    expect(JSON.stringify(ld)).not.toContain("acceptedAnswer");
  });

  it("revealed: carries acceptedAnswer with the correct option text", () => {
    const ld = questionJsonLd(q, true);
    const part = (ld.hasPart as Record<string, unknown>[])[0];
    expect(part.acceptedAnswer).toEqual({ "@type": "Answer", text: "Головна дорога" });
    expect(JSON.stringify(ld)).toContain("acceptedAnswer");
  });
});
