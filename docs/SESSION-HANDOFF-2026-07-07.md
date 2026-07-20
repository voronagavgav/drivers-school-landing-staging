# Session handoff — 2026-07-06 → 07

Resume anchor for the next session. Everything below is committed + pushed (app repo `voronagavgav/Driving` @ `main`; landing repos pushed to their GitHub Pages remotes). Rollback anchor for the whole audit lineage: `git tag pre-full-audit-2026-07-06`.

## What shipped this session
1. **Full automatic project audit** (workflow) → `docs/audit/FULL-AUDIT-2026-07-06.md`. Applied: dead-code removal, stray `dev.db`, **theme-token unification** (legacy color aliases → canonical, then the 7 orphaned alias defs deleted — theme debt closed), showcase `items.json`. All gated green.
2. **Database FK/index fix** — added relations + indexes for the loose `categoryId`/`ReviewLog` refs (migration `20260706180000_loose_ref_fks_indexes`), data-preserving, verified.
3. **Dead-landing cleanup** — removed stale variant-G + 6.1 MB `thumb-g.png`, `map-bg.html`, `phone.html`, rejected mobile M1–M4 (both landing repos).
4. **FSRS + readiness-dial "secret sauce" research** — two deep-research passes (25 + 22 verified findings) → **`docs/research/FSRS-READINESS-STRATEGY-2026-07-07.md`** (the strategy bible; read this first for the roadmap).
5. **✅ FSRS-5 → FSRS-6 migration SHIPPED** (Wave 19a tasks 01-03, harness): 21 weights + trainable decay derived from `w20`, validated against the FSRS-6 reference-vector oracle. **618 unit tests + typecheck + build all green.**
6. **Claude Design sync** — current landing (`index.html`) + mobile (`mobile-m5.html`) loaded into the DS project (`799bf8c3-…`).

## In progress — Wave 19a calibration pipeline (NEXT-SESSION RESUME)
Spec: `specs/wave19a-fsrs-secret-sauce.md`. FSRS-6 (Part 1) is **done**. The **calibration pipeline (Part 2)** is planned but **not built** — tasks `wave19a-04..09` (PassOutcome table, pure metrics lib, record-exam-outcome action, capture UI, admin view, verify). They **blocked on a late-run account rate-limit, NOT a real failure — zero partial state** (no half-applied migration; schema clean). Already **reset to `active`**.

**To resume:** `cd ~/drivers-school && ./mesa run-all` (config model = Opus). ⚠️ Before launching, `grep -rl 'claude-fable-5' tasks/wave19a-*/journal.md` and flip any to `claude-opus-4-8` — the planner mis-routes "subtle" tasks to Fable, which is daily-limited and fast-fails/blocks (this cost a stuck loop this session; see [[reference-workflow-gotchas]]).

## Roadmap (from the research — all math specified in the strategy doc)
- **Wave B**: beta-binomial **dial honesty fix** (stops over-stating readiness on correlated within-topic items — cheap, pure integrity win) + **BAMA/BKT grade inference** (replaces the latency heuristic; upstream of everything).
- **Wave C** *(data-gated)*: **exam-date-aware scheduling** (dip→ramp target retention, reinforce-failed-last) + **per-user weight fits** (CV-tuned shrink-to-population vector).
- **The moat only proves out with real traffic** — the calibration pipeline collects the ground-truth from day one, but per-user weights + calibration validation need users producing reviews/exam outcomes.

## Other open threads (Danil's call)
- **Get traffic / turn on the funnel** — Gate-0 conversion wave is coded but flag-off; still blocked on **public origin + LiqPay/Fondy account**. This is what starts the data flywheel that the FSRS moat needs.
- **Mobile hero gap** (M6) — landing hero still needs a first-viewport CTA button (both branded-hero attempts rejected). See `~/pdr-landing-site/NEXT-SESSION.md`.
- **Claude Design cleanup** — offered to remove the redundant `variant-b.html` + `variant-g-stable.html` cards so the `Лендінг` group shows only the current live landing. Not yet done (awaiting Danil's ok).
- **Restyle** — 20 pending + ~1000 un-restyled images.

## Health at wrap
App tree clean, `main` == GitHub `main` (`3302e57`), typecheck + 618 tests + build green. FSRS-6 is live.
