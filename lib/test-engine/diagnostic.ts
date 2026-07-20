// DIAGNOSTIC selection (spec §B) — a one-shot, zero-prior-state spread across the exam blueprint.
//
// PURE MODULE: no DB, no clock, no ambient randomness. All randomness enters through the injected
// `opts.rng`; the signature carries NO ReviewState and no `now` because a DIAGNOSTIC is taken at the
// very start of a journey, BY CONSTRUCTION, before any review history exists.
//
// ── NORMATIVE ALGORITHM (frozen; wave15-06 implements EXACTLY this — the oracle vectors assume it) ─
//   (i)   Group candidates by block via `groupCandidatesByBlock` (reuse lib/exam-blueprint — never
//         reimplement section bucketing). Each candidate carries its explicit official `section`
//         (derived upstream from the stable questionKey, immune to Topic.displayOrder drift).
//   (ii)  Nominal per-block counts: fixed `count` blocks as-is; ranged blocks at their range MIN (no
//         rng for counts); remainder block = blueprint.total minus the sum of the others.
//   (iii) Scale to opts.count by LARGEST-REMAINDER (Hamilton): quota_i = nominal_i times count
//         divided by blueprint.total; allocate floor(quota_i); hand out the remaining seats one each
//         by DESCENDING fractional remainder; ties resolve to the earlier block in blueprint.blocks
//         order.
//   (iv)  Underfill: a block with fewer candidates than its allocation contributes all it has; each
//         unfilled seat is redistributed by cycling blocks in blueprint.blocks order, one seat per
//         pass, skipping blocks with no unpicked candidates, until `count` is reached or candidates
//         are exhausted (take what exists — no invention).
//   (v)   Within a block: Fisher-Yates shuffle with the injected rng, then STABLE sort by difficulty
//         ascending, take the allocated number.
//   (vi)  Output: all picked ids STABLE-sorted by difficulty ascending globally (stability over
//         blueprint block order gives a deterministic result under a fixed rng).
//
// `count` defaults to DIAGNOSTIC_COUNT (15). See lib/test-engine/diagnostic.test.ts for the frozen
// oracle. Implemented in wave15-06.

import { groupCandidatesByBlock, type ExamBlueprint } from "../exam-blueprint";
import { DIAGNOSTIC_COUNT } from "../constants";

export interface DiagnosticCandidate {
  id: string;
  /** Official наказ section (from the stable questionKey via sectionFromQuestionKey); null → remainder. */
  section: number | null;
  difficulty: number;
}

export function selectDiagnostic(
  blueprint: ExamBlueprint,
  candidates: readonly DiagnosticCandidate[],
  opts: { count?: number; rng?: () => number },
): string[] {
  const count = opts.count ?? DIAGNOSTIC_COUNT;
  const rng = opts.rng ?? (() => 0.5);

  const byId = new Map(candidates.map((c) => [c.id, c]));

  // (i) group candidates by block — reuse the blueprint machinery (never reimplement §→order).
  const groups = groupCandidatesByBlock(blueprint, candidates);
  const available: Record<string, number> = {};
  for (const block of blueprint.blocks) available[block.key] = groups[block.key].length;

  // (ii) nominal per-block counts: fixed as-is, ranged at MIN, remainder = total − Σ(others).
  const nominal: Record<string, number> = {};
  let othersSum = 0;
  for (const block of blueprint.blocks) {
    if (block.key === blueprint.remainderKey) continue;
    const n = block.count != null ? block.count : block.range![0];
    nominal[block.key] = n;
    othersSum += n;
  }
  nominal[blueprint.remainderKey] = blueprint.total - othersSum;

  // (iii) scale to `count` by largest-remainder (Hamilton); ties → earlier block in blocks order.
  const quotas = blueprint.blocks.map((block, idx) => ({
    key: block.key,
    quota: (nominal[block.key] * count) / blueprint.total,
    idx,
  }));
  const alloc: Record<string, number> = {};
  let allocated = 0;
  for (const q of quotas) {
    alloc[q.key] = Math.floor(q.quota);
    allocated += alloc[q.key];
  }
  const leftover = count - allocated;
  const byRemainder = [...quotas].sort(
    (a, b) => b.quota - Math.floor(b.quota) - (a.quota - Math.floor(a.quota)) || a.idx - b.idx,
  );
  for (let i = 0; i < leftover && i < byRemainder.length; i++) alloc[byRemainder[i].key] += 1;

  // initial picks = min(allocation, available)
  const picked: Record<string, number> = {};
  let totalPicked = 0;
  for (const block of blueprint.blocks) {
    picked[block.key] = Math.min(alloc[block.key] ?? 0, available[block.key]);
    totalPicked += picked[block.key];
  }

  // (iv) underfill: redistribute unfilled seats by cycling blocks in order (skip exhausted blocks),
  // one seat per block visit, until `count` reached or candidates exhausted.
  while (totalPicked < count) {
    let progress = false;
    for (const block of blueprint.blocks) {
      if (totalPicked >= count) break;
      if (picked[block.key] < available[block.key]) {
        picked[block.key] += 1;
        totalPicked += 1;
        progress = true;
      }
    }
    if (!progress) break;
  }

  // (v) within a block: Fisher-Yates shuffle with the injected rng, STABLE sort by difficulty asc,
  // take the allocated number.
  const chosen: DiagnosticCandidate[] = [];
  for (const block of blueprint.blocks) {
    const n = picked[block.key];
    if (n <= 0) continue;
    const arr = groups[block.key].map((id) => byId.get(id)!);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    arr.sort((a, b) => a.difficulty - b.difficulty);
    chosen.push(...arr.slice(0, n));
  }

  // (vi) all picked ids STABLE-sorted by difficulty ascending globally.
  chosen.sort((a, b) => a.difficulty - b.difficulty);
  return chosen.map((c) => c.id);
}

// weakestTopicFromAnswers (spec §D) — the DIAGNOSTIC finish names the ONE topic to start with,
// derived from the diagnostic's OWN answers (NOT from getLatestReadiness, which needs a snapshot
// the diagnostic can't yet have). PURE: no DB, no clock.
//
// ── NORMATIVE (frozen; see lib/test-engine/diagnostic-finish.test.ts) ─
//   per-topic accuracy = correct / total; weakest = LOWEST accuracy; ties → MORE wrong answers wins;
//   still tied → lexicographically smallest topicId. Returns null when input is empty OR every
//   topic's accuracy is 1.0 (never a fabricated weakness — an all-correct diagnostic has no "weak"
//   topic to invent).
export function weakestTopicFromAnswers(
  answers: readonly { topicId: string; isCorrect: boolean }[],
): string | null {
  if (answers.length === 0) return null;

  const stats = new Map<string, { total: number; wrong: number }>();
  for (const a of answers) {
    const s = stats.get(a.topicId) ?? { total: 0, wrong: 0 };
    s.total += 1;
    if (!a.isCorrect) s.wrong += 1;
    stats.set(a.topicId, s);
  }

  let best: { topicId: string; accuracy: number; wrong: number } | null = null;
  for (const [topicId, { total, wrong }] of stats) {
    const accuracy = (total - wrong) / total;
    if (
      best === null ||
      accuracy < best.accuracy ||
      (accuracy === best.accuracy && wrong > best.wrong) ||
      (accuracy === best.accuracy && wrong === best.wrong && topicId < best.topicId)
    ) {
      best = { topicId, accuracy, wrong };
    }
  }

  // never a fabricated weakness — an all-perfect diagnostic returns null.
  if (best === null || best.accuracy >= 1) return null;
  return best.topicId;
}
