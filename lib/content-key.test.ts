import { describe, it, expect } from "vitest";
import { questionKey, optionKey, sectionFromQuestionKey } from "@/lib/content-key";

describe("questionKey", () => {
  it("joins section and qnum with underscores: q_<section>_<qnum>", () => {
    expect(questionKey("11", 7)).toBe("q_11_7");
    expect(questionKey("8", 1)).toBe("q_8_1");
  });

  it("normalizes each '.' in the section to '_'", () => {
    expect(questionKey("8.1", 2)).toBe("q_8_1_2");
    expect(questionKey("1.2", 3)).toBe("q_1_2_3");
    expect(questionKey("12.3.4", 5)).toBe("q_12_3_4_5");
  });
});

describe("optionKey", () => {
  it("appends a '__' separator and the 1-based ordinal", () => {
    expect(optionKey("q_11_7", 1)).toBe("q_11_7__1");
    expect(optionKey("q_8_1_2", 3)).toBe("q_8_1_2__3");
  });
});

describe("sectionFromQuestionKey", () => {
  it("recovers the top-level наказ section from a questionKey", () => {
    expect(sectionFromQuestionKey("q_31_5")).toBe(31);
    expect(sectionFromQuestionKey("q_1_79")).toBe(1);
    expect(sectionFromQuestionKey("q_33_10")).toBe(33);
  });

  it("maps a dotted subsection to its PARENT section", () => {
    // "8.1" normalizes to "8_1" in the key; the section is the FIRST numeric group → 8.
    expect(sectionFromQuestionKey("q_8_1_2")).toBe(8);
    expect(sectionFromQuestionKey("q_12_3_4_5")).toBe(12);
  });

  it("returns null for a malformed key", () => {
    expect(sectionFromQuestionKey("")).toBeNull();
    expect(sectionFromQuestionKey("abc")).toBeNull();
    expect(sectionFromQuestionKey("q__1")).toBeNull();
  });

  it("round-trips the section through questionKey", () => {
    expect(sectionFromQuestionKey(questionKey("31", 5))).toBe(31);
    expect(sectionFromQuestionKey(questionKey("8.1", 2))).toBe(8);
  });
});

describe("injectivity", () => {
  // A representative, ambiguity-prone set of distinct (section, qnum) inputs.
  // Includes the "8" vs "8.1" pair (dotted section shares a stem with the plain
  // one) and the "12" vs "1.2" pair (different dot placement), exactly the cases
  // a naive concatenation could collide on.
  const inputs: ReadonlyArray<[string, number]> = [
    ["8", 1],
    ["8", 11],
    ["8.1", 1],
    ["8.1", 2],
    ["8.1", 11],
    ["1", 2],
    ["12", 3],
    ["1.2", 3],
    ["1.2", 33],
    ["11", 7],
    ["1.1", 7],
  ];

  it("maps distinct (section, qnum) to distinct questionKeys", () => {
    const keys = inputs.map(([section, qnum]) => questionKey(section, qnum));
    expect(new Set(keys).size).toBe(inputs.length);
  });

  it("keeps the '8' vs '8.1' and '12' vs '1.2' pairs distinct", () => {
    expect(questionKey("8", 1)).not.toBe(questionKey("8.1", 1));
    expect(questionKey("12", 3)).not.toBe(questionKey("1.2", 3));
  });

  it("maps distinct (questionKey, n) to distinct optionKeys", () => {
    const keys = inputs.map(([section, qnum]) => questionKey(section, qnum));
    const optionInputs: ReadonlyArray<[string, number]> = keys.flatMap((k) =>
      [1, 2, 3, 4].map((n) => [k, n] as [string, number]),
    );
    const optionKeys = optionInputs.map(([k, n]) => optionKey(k, n));
    expect(new Set(optionKeys).size).toBe(optionInputs.length);
  });
});
