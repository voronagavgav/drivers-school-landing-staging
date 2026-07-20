export const meta = {
  name: 'wave-review',
  description: 'Adversarial post-wave review: hostile reviewers over the wave diff (vs external references where applicable) + next-wave plan coherence; every finding skeptic-verified before it counts',
  whenToUse: 'Run after a harness wave, before closing it in PLAN.md — depth SCALED TO RISK: full default panel for engine/math/data waves; swap `focus` lenses for design/UI waves (rendering/a11y/perf, not FSRS-math); skip for trivial copy-only waves. SUNSET RULE: if reviews start confirming ~zero findings (oracle rules catching the class upstream), demote to engine-waves + spot-checks — a layer that stops finding things has done its job. args: { range: "shaA..shaB" (the wave diff), context: "what the wave built + doc pointers", focus?: [{key, prompt}], verifyModel?: "fable"|"opus" }. ⚠ The skeptic (Verify) layer defaults to Fable (cheap, its designated tier) — when Fable is at its DAILY limit or the wave is security-sensitive, pass verifyModel:"opus" or the verify agents die on the limit (proven wave18-review 2026-07-06: the run had to be resumed on Opus). ⚠ Launching by {name:"wave-review"} can snapshot a PRE-EDIT copy of this file — if you just edited it, verify the PERSISTED script reflects the change or edit that persisted script + resume.',
  phases: [
    { title: 'Review', detail: 'hostile reviewers, one per dimension (Opus)' },
    { title: 'Verify', detail: 'independent skeptic per finding (session model)' },
  ],
}

// Why this exists (Wave 10, 2026-07-01): 11 tasks, all gates green, evaluator PASS on every task —
// then this exact review shape confirmed 18 real defects (7 major). Per-task gates measure
// self-consistency; only an external-reference adversarial pass measures correctness.

const REPO = '/Users/clpc/drivers-school'
// args may arrive as a JSON STRING (the stringified-args trap) — accept both.
let A = args
if (typeof A === 'string') { try { A = JSON.parse(A) } catch (e) { A = {} } }
A = A || {}
const range = A.range
if (!range) throw new Error('wave-review needs args.range = "shaA..shaB" (the wave diff)')
const context = A.context ?? '(no wave context supplied — read PLAN.md tail + docs/app-plan/ yourself)'
// Skeptic (Verify) layer model — DEFAULT 'fable' (cheap), overridable to 'opus' when Fable is
// daily-limited or the wave is security-sensitive (the gotcha the NEXT-SESSION anchor calls out).
const verifyModel = A.verifyModel ?? 'fable'

const CTX = `
REPO: ${REPO} (Next 16 / React 19 / Tailwind v4 / Prisma 7 libsql). Wave diff under review: ${range}
(use \`git diff ${range}\` / \`git log ${range}\` to scope yourself; read full files, not just hunks).
WAVE CONTEXT: ${context}
KNOWN RISK CLASS: the same autonomous driver authors code AND tests — green means self-consistent, not
correct. Hunt precisely where self-authored gates cannot see.
HARD CONSTRAINTS the wave must not violate: stable-key content architecture (questionKey/optionKey/imageKey,
idempotent upsert preserving user progress); pure lib/ vs lib/server split; Ukrainian copy; legal positioning
(no official-exam claims); honest stats only; the design-taste and perf rules in docs/app-plan/.
`

const DEFAULT_FOCUS = [
  { key: 'correctness-vs-reference', prompt: `Hostile correctness reviewer. For every algorithm/formula/protocol this wave touched, compare the implementation against its EXTERNAL authority — the published spec/algorithm it claims (load WebSearch/WebFetch via ToolSearch if needed), the master-plan docs (docs/app-plan/), or hand-computed known answers. Do NOT trust the wave's own tests as evidence. Report deviations that change behaviour, with side-by-side evidence.` },
  { key: 'production-path', prompt: `Hostile wiring reviewer. For every capability this wave claims to add, trace the REAL production path end-to-end: UI/client → zod validation → server action/route → lib/server → DB. Hunt: fields stripped by validation schemas; features reachable only in tests (direct internal calls bypassing the action layer); dead code paths; new modes/flags startable by clients but unwired; back-compat breaks for existing callers.` },
  { key: 'tests-quality', prompt: `Hostile test auditor. Read every test this wave added/changed. Flag: expected values derived FROM the implementation under test (self-referential — green by construction); tests weakened/edited to fit code; integration tests bypassing the production entry path; boundary cases systematically avoided (0, 1, empty, share=0, size=1); vacuous assertions. Name each offending test precisely.` },
  { key: 'schema-migration', prompt: `Hostile schema/migration reviewer (skip with a one-line 'no schema changes' if none). Check schema↔SQL consistency (prove with \`npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script\` — must be empty), SQLite correctness, Postgres portability, index sufficiency AND redundancy, onDelete semantics vs repo convention (historical corpora = Restrict), data preservation on re-seed.` },
  { key: 'plan-coherence', prompt: `Product/tech lead. Read PLAN.md tail + docs/app-plan/00-MASTER-PLAN.md (incl. Addendum). Given what THIS wave actually shipped: is the NEXT wave's scope still right? Any dependency now broken, gate now unrunnable, open question now blocking, or sequencing flaw visible? End with an overall verdict: proceed / proceed-with-changes / replan.` },
]
const FOCUS = A.focus?.length ? A.focus : DEFAULT_FOCUS

const FINDINGS = { type: 'object', additionalProperties: false, properties: {
  findings: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
    title: { type: 'string' }, file: { type: 'string' },
    severity: { type: 'string', enum: ['critical', 'major', 'minor', 'nit'] },
    detail: { type: 'string' }, fix: { type: 'string' },
  }, required: ['title', 'file', 'severity', 'detail', 'fix'] } },
  summary: { type: 'string' },
}, required: ['findings', 'summary'] }

const VERDICT = { type: 'object', additionalProperties: false, properties: {
  isReal: { type: 'boolean' },
  confirmedSeverity: { type: 'string', enum: ['critical', 'major', 'minor', 'nit', 'not-a-bug'] },
  reasoning: { type: 'string' },
}, required: ['isReal', 'confirmedSeverity', 'reasoning'] }

const results = await pipeline(
  FOCUS,
  f => agent(`${f.prompt}\n${CTX}\nReport ONLY genuine defects (severity honestly; cosmetic = nit).`,
    { label: `review:${f.key}`, phase: 'Review', schema: FINDINGS, model: 'opus' }),
  (review, f) => review ? parallel(review.findings.filter(x => x.severity !== 'nit').map(x => () =>
    agent(`Adversarially verify this finding about ${REPO}. Read the actual current file(s) yourself and try to REFUTE it. Real only if the defect exists in CURRENT code and materially matters. Default isReal=false when uncertain or cosmetic.\nFINDING [${x.severity}] ${x.title} @ ${x.file}\n${x.detail}\nPROPOSED FIX: ${x.fix}\n${CTX}`,
      { label: `verify:${f.key}:${x.title.slice(0, 40)}`, phase: 'Verify', schema: VERDICT, model: verifyModel })
      .then(v => ({ ...x, dimension: f.key, verdict: v }))
  )).then(vs => ({ key: f.key, summary: review.summary, verified: vs.filter(Boolean) })) : null
)

const flat = results.filter(Boolean)
const confirmed = flat.flatMap(r => r.verified).filter(x => x.verdict?.isReal)
return {
  range,
  summaries: Object.fromEntries(flat.map(r => [r.key, r.summary])),
  confirmedFindings: confirmed.map(x => ({ dimension: x.dimension, severity: x.verdict.confirmedSeverity, title: x.title, file: x.file, detail: x.detail, fix: x.fix })),
  rejectedCount: flat.flatMap(r => r.verified).length - confirmed.length,
}
