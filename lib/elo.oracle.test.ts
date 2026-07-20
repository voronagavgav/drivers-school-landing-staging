import { describe, it, expect } from "vitest";
import { kFor, guessFloor, eloUpdate, foldEloStream } from "./elo";

// FROZEN ORACLE for the online Elo/Rasch item-difficulty estimator (Wave 22,
// spec `specs/wave22-elo-difficulty.md`, Deliverable 1 (a)–(f)) — the future
// pure module `./elo` (wave22-04) MUST MATCH these values; the implementation
// is NOT written here, and the impl task may NOT edit this file.
//
// Every literal is EXTERNAL: transcribed verbatim from the python reference
// oracle's captured stdout
// `tasks/wave22-01-python-oracle/PREVERIFY-OUTPUT.txt`
// (`scripts/oracles/gen-wave22-oracles.py`, stdlib-only, run 2026-07-14).
// DO NOT regenerate these literals from the TS implementation, and do not edit
// the literals or tolerances — wave22-05 only un-skips and matches them.
//
// The frozen model (spec §Design), logit-space Rasch/Elo, guess-adjusted 3PL-lite:
//   g   = min(1/optionCount, guessMax)                 (guess floor)
//   P   = g + (1−g)·sigmoid(θ−β)                        (predicted P(correct))
//   e   = y − P                                          (residual)
//   K(n)= kMax / (1 + n/kHalflife)                       (uncertainty-adaptive rate)
//   θ'  = θ + K(nUser)·e ,  β' = β − K(nItem)·e         (counters PRE-increment)
// A fold consumes answers in the GIVEN order (server sorts answeredAt/id; the
// fold itself is order-as-given) and never sorts internally.
//
// The impl-binding suite is live (wave22-05 un-suspended it): it imports the real
// `./elo` (wave22-04) statically and matches these frozen literals — the external
// oracle confirming the impl, which could not edit this file.

// ---- frozen constants of the pinned model (PREVERIFY header) ----------------
const PARAMS = {
  kMax: 0.4, // ELO_K_MAX
  kHalflife: 20, // ELO_K_HALFLIFE
  guessMax: 0.45, // ELO_GUESS_MAX (shares FSRS_GUESS_MAX)
  initialBeta: 0, // INIT_BETA
  initialTheta: 0, // INIT_THETA
};

// ---- frozen literals (from gen-wave22-oracles.py, 6 dp) ---------------------
// (a″) K schedule points — K(n) = kMax / (1 + n/kHalflife)
const K0 = 0.4;
const K10 = 0.266667;
const K200 = 0.036364;

// (a′) plain-vs-guess single update — θ=0 β=0 y=1 K=K(0)=0.4.
// plain: P=0.5 ⇒ e=0.5; guess g=0.2 (optionCount=5): P=0.6 ⇒ e=0.4.
const BETA_PLAIN = -0.2;
const THETA_PLAIN = 0.2;
const BETA_G020 = -0.16;
const THETA_G020 = 0.16;

// (b) fold determinism — fixed 40-answer stream (5 users × 8 items), one answer
// per (user, item), user-outer order ("answeredAt sorted"), folded once.
// Per-item final β and answer count n:
const FOLD_ITEM: Record<string, { beta: number; n: number }> = {
  q0: { beta: 0.040006, n: 5 },
  q1: { beta: 0.357102, n: 5 },
  q2: { beta: 0.015452, n: 5 },
  q3: { beta: 0.334477, n: 5 },
  q4: { beta: -0.00423, n: 5 },
  q5: { beta: 0.316126, n: 5 },
  q6: { beta: -0.020299, n: 5 },
  q7: { beta: 0.301, n: 5 },
};
// Per-user final θ and answer count n:
const FOLD_USER: Record<string, { theta: number; n: number }> = {
  u0: { theta: -0.287736, n: 8 },
  u1: { theta: -0.24705, n: 8 },
  u2: { theta: -0.257149, n: 8 },
  u3: { theta: -0.220105, n: 8 },
  u4: { theta: -0.232242, n: 8 },
};

// (c) order sensitivity — SAME multiset, the sorted stream REVERSED ⇒ different
// final β for q0 (the reversal changes the relative order users hit each item).
const ORDER_BETA_SORTED = 0.040006; // === FOLD_ITEM.q0.beta
const ORDER_BETA_SHUFFLED = -0.033619;

// The fixed synthetic (b) stream, rebuilt in the SAME shape as the python
// (stream_b_sorted): correct = (u+i) even, optionCount 4, one answer per pair.
function streamBSorted() {
  const out: {
    userId: string;
    questionId: string;
    correct: boolean;
    optionCount: number;
    answeredAt: number;
  }[] = [];
  let t = 0;
  for (let u = 0; u < 5; u++) {
    for (let i = 0; i < 8; i++) {
      out.push({
        userId: `u${u}`,
        questionId: `q${i}`,
        correct: (u + i) % 2 === 0,
        optionCount: 4,
        answeredAt: t++,
      });
    }
  }
  return out;
}

describe("elo estimator (frozen oracle, un-skipped in wave22-05)", () => {
  it("(a″) K schedule — K(0)>K(10)>K(200) at the frozen points", () => {
    expect(kFor(0, PARAMS)).toBeCloseTo(K0, 6);
    expect(kFor(10, PARAMS)).toBeCloseTo(K10, 5);
    expect(kFor(200, PARAMS)).toBeCloseTo(K200, 5);
    // guess floor: 4-option ⇒ 0.25, 5-option ⇒ 0.20, 2-option clamped at guessMax.
    expect(guessFloor(5, PARAMS)).toBeCloseTo(0.2, 6);
    expect(guessFloor(4, PARAMS)).toBeCloseTo(0.25, 6);
    expect(guessFloor(2, PARAMS)).toBeCloseTo(PARAMS.guessMax, 6);
  });

  it("(a′) guess-adjusted single update — g=0.2 (optionCount=5), K=K(0)=0.4", () => {
    const r = eloUpdate(
      { theta: 0, beta: 0, thetaN: 0, betaN: 0, correct: true, optionCount: 5 },
      PARAMS,
    );
    expect(r.beta).toBeCloseTo(BETA_G020, 6);
    expect(r.theta).toBeCloseTo(THETA_G020, 6);
  });

  it("(b) fold determinism — every item β/n and every user θ/n on the 40-answer stream", () => {
    const { items, users } = foldEloStream(streamBSorted(), PARAMS);
    for (const [qid, exp] of Object.entries(FOLD_ITEM)) {
      const got = items.get(qid);
      expect(got?.n).toBe(exp.n);
      expect(got?.beta).toBeCloseTo(exp.beta, 5);
    }
    for (const [uid, exp] of Object.entries(FOLD_USER)) {
      const got = users.get(uid);
      expect(got?.n).toBe(exp.n);
      expect(got?.theta).toBeCloseTo(exp.theta, 5);
    }
  });

  it("(c) order sensitivity — the reversed stream shifts q0's final β", () => {
    const sorted = foldEloStream(streamBSorted(), PARAMS);
    const shuffled = foldEloStream([...streamBSorted()].reverse(), PARAMS);
    expect(sorted.items.get("q0")?.beta).toBeCloseTo(ORDER_BETA_SORTED, 5);
    expect(shuffled.items.get("q0")?.beta).toBeCloseTo(ORDER_BETA_SHUFFLED, 5);
    expect(shuffled.items.get("q0")?.beta).not.toBeCloseTo(ORDER_BETA_SORTED, 5);
  });
});

// IMPL-INDEPENDENT self-consistency of the frozen literals themselves — so
// `npx vitest list` collects this file and it stays green BEFORE wave22-04/05.
// Grades the frozen numbers' internal relationships, not the not-yet-written impl.
describe("frozen Elo oracle literals are self-consistent (no impl)", () => {
  it("(a″) K schedule is strictly decreasing on the frozen points", () => {
    expect(K0).toBeGreaterThan(K10);
    expect(K10).toBeGreaterThan(K200);
    expect(K0).toBeCloseTo(0.4, 6); // K(0) = kMax
  });

  it("(a′) guess weakens the evidence — |β_guess| < |β_plain|, same-signed", () => {
    expect(Math.abs(BETA_G020)).toBeLessThan(Math.abs(BETA_PLAIN));
    expect(Math.abs(THETA_G020)).toBeLessThan(Math.abs(THETA_PLAIN));
    // symmetric update: item drops by exactly what the user gains.
    expect(BETA_PLAIN).toBeCloseTo(-THETA_PLAIN, 12);
    expect(BETA_G020).toBeCloseTo(-THETA_G020, 12);
  });

  it("(b) fold conserves answers — every item n=5 (× 8 items) and user n=8 (× 5 users) = 40", () => {
    const items = Object.values(FOLD_ITEM);
    const users = Object.values(FOLD_USER);
    expect(items).toHaveLength(8);
    expect(users).toHaveLength(5);
    for (const it of items) expect(it.n).toBe(5);
    for (const u of users) expect(u.n).toBe(8);
    const itemAnswers = items.reduce((s, it) => s + it.n, 0);
    const userAnswers = users.reduce((s, u) => s + u.n, 0);
    expect(itemAnswers).toBe(40);
    expect(userAnswers).toBe(40);
  });

  it("(c) order sensitivity — sorted matches the fold, reversed differs", () => {
    expect(ORDER_BETA_SORTED).toBeCloseTo(FOLD_ITEM.q0.beta, 12);
    expect(ORDER_BETA_SHUFFLED).not.toBeCloseTo(ORDER_BETA_SORTED, 5);
  });
});
