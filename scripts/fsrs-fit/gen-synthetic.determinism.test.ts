// ---------------------------------------------------------------------------
// DETERMINISM + PERTURBATION-FLOW unit test for the synthetic generator
// (gen-synthetic.ts). This proves REPRODUCIBILITY, not FSRS correctness — the
// state-model correctness is the param-engine oracle (wave24-06) and the whole
// pipeline's correctness is the recovery/null gate (wave24-08). So there is NO
// "fitted beats default" assertion here (per the task constraints).
//
//   (4)  same seed  ⇒ deep-identical row arrays; different seed ⇒ different.
//   (4b) same seed, DEFAULT vs PERTURBED weights ⇒ different arrays (the
//        perturbed w-vector changes the recall/cadence pattern).
//   (5)  REGIME: for a ~500-review/user config every per-user review count lands
//        inside the exam-prep band [300, 1500].
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { FSRS_DEFAULT_WEIGHTS } from "@/lib/fsrs";
import { generate, perturbedWeights, type GenConfig, type SyntheticRow } from "./gen-synthetic";

const baseCfg: GenConfig = {
  seed: 12345,
  users: 2,
  cards: 20,
  reviews: 500,
  weights: FSRS_DEFAULT_WEIGHTS,
};

const fingerprint = (rows: SyntheticRow[]): string => JSON.stringify(rows);

describe("gen-synthetic determinism", () => {
  it("ok determinism sameSeedEqual + diffSeedDiffers", () => {
    const a = generate(baseCfg);
    const b = generate(baseCfg);
    const c = generate({ ...baseCfg, seed: 67890 });

    const sameSeedEqual = fingerprint(a) === fingerprint(b);
    const diffSeedDiffers = fingerprint(a) !== fingerprint(c);

    // eslint-disable-next-line no-console -- Goal-4 requires this printed line.
    console.log(`ok determinism sameSeedEqual=${sameSeedEqual} diffSeedDiffers=${diffSeedDiffers}`);

    expect(a).toEqual(b); // deep-equal, same seed
    expect(sameSeedEqual).toBe(true);
    expect(diffSeedDiffers).toBe(true);
  });

  it("perturbation flow: default vs perturbed weights produce different arrays", () => {
    const def = generate({ ...baseCfg, weights: FSRS_DEFAULT_WEIGHTS });
    const pert = generate({ ...baseCfg, weights: perturbedWeights() });
    expect(fingerprint(def)).not.toEqual(fingerprint(pert));
  });

  it("regime: every per-user review count is within [300, 1500]", () => {
    const rows = generate(baseCfg);

    const counts = new Map<number, number>();
    for (const row of rows) {
      const user = Math.floor(row.card_id / baseCfg.cards);
      counts.set(user, (counts.get(user) ?? 0) + 1);
    }

    const perUser = [...counts.values()];
    expect(perUser.length).toBe(baseCfg.users);
    const min = Math.min(...perUser);
    const max = Math.max(...perUser);
    expect(min).toBeGreaterThanOrEqual(300);
    expect(max).toBeLessThanOrEqual(1500);
  });

  it("rows carry the CSV schema fields with sampled Good/Again ratings", () => {
    const rows = generate({ ...baseCfg, reviews: 300 });
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows.slice(0, 50)) {
      expect(typeof row.card_id).toBe("number");
      expect(typeof row.review_time).toBe("number");
      expect([1, 3]).toContain(row.review_rating);
    }
  });
});
