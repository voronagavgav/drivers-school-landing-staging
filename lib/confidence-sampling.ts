// ---------------------------------------------------------------------------
// Pure, deterministic confidence sampling. No DB, no randomness, no clock —
// the decision is a hash of (sessionId, questionId), so the same pair samples
// the same way on every render/reload, on the server and the client alike.
// Roughly 1 in CONFIDENCE_SAMPLE_RATE answered questions gets the follow-up.
// ---------------------------------------------------------------------------

import { CONFIDENCE_SAMPLE_RATE } from "@/lib/constants";

/**
 * FNV-1a 32-bit hash. Basis 0x811c9dc5, prime 0x01000193; per char the code
 * unit is XORed in, then the hash is multiplied by the prime (Math.imul keeps
 * the 32-bit overflow semantics). Returns an unsigned 32-bit integer.
 */
export function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * True when this (session, question) pair is sampled for the confidence
 * follow-up. The ":" separator keeps ("ab","c") and ("a","bc") distinct.
 */
export function isConfidenceSampled(sessionId: string, questionId: string): boolean {
  return fnv1a32(sessionId + ":" + questionId) % CONFIDENCE_SAMPLE_RATE === 0;
}
