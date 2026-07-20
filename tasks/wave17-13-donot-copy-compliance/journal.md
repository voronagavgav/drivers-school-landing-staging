# Task: wave17-13-donot-copy-compliance

**Status:** done
**Driver:** auto
**Updated:** 2026-07-05T01:40Z
**Last compute:** ClPcs-Mac-mini

## Goal
A durable, executable HARD-DO-NOT compliance gate over the wave-17 funnel surfaces + a freemium-
inversion (content-never-gated) assertion. This task ships ONE guard script that the wave-review lens
can re-run. PASS = ALL true:

1. `scripts/funnel-donot-guard.sh` exists (executable) and greps the wave-17 funnel surfaces (the
   offer card, save prompt, segment flow, checkout, A2HS, pricing) for the DO-NOT tokens, FAILING
   (exit 1) if any is present in shipped copy:
   - countdown / «ціна діє ще» / any timer-urgency string;
   - phantom scarcity «залишилось [0-9]» / «купують зараз» / «X купують»;
   - fake discount «було [0-9]» / «SALE» / «знижк»;
   - confirmshaming decline «Ні, я не хочу…» (dismiss must be «Не зараз»);
   - subscription/auto-renew wording on the one-time offer («підписк» except in the ALLOWED negations
     «не підписка»/«Без підписки» — the guard must allow the negated forms and only flag a positive
     subscription claim);
   - «Купити» as a buy CTA (the buy CTA must be outcome-named).
2. The guard also asserts the anti-subscription line «не підписка»/«Без підписки» IS present on the
   offer/checkout surfaces (a required-positive check, not just absence).
3. FREEMIUM INVERSION check: the guard (or a sibling assertion) confirms no wave-17 code path gates
   the QUESTION CONTENT behind login/entitlement for the play loop — i.e. `startSession`/`submitAnswer`
   remain reachable by an anon user (grep that the play actions use `requirePlayableUser`, not a
   hard entitlement gate). Content gating is FORBIDDEN; only the intelligence layer (dial/plan/
   analytics) is paid.
4. The guard is wired so `npm run` or the wave-14 audit can invoke it; running it against the current
   tree exits 0 (no violations) once wave17-06/07/08/09/10 land. If run before those surfaces exist,
   it must not false-fail on absent files (guard skips missing targets gracefully, but fails on a
   present file that contains a forbidden token).
5. verify.sh runs `scripts/funnel-donot-guard.sh` and asserts exit 0.

## Constraints / decisions
- This is a CROSS-CUTTING compliance gate — it is the executable form of the spec's HARD DO-NOT block
  and the wave-review "DO-NOT compliance" lens. Keep it token-based + greppable so it is durable.
- ALLOWED negations must not trip the guard: «не підписка», «Без підписки», «разовий платіж, не
  підписка» are REQUIRED honest copy — the subscription check must match a POSITIVE subscription
  claim only (e.g. «щомісячна підписка», «автопродовження»), never the negated forms. Implement with
  care (grep out the allowed forms before flagging).
- GREP HYGIENE (CLAUDE.md): use `grep -E` not BRE `\+`; do not mask errors with `|| true` on the
  check itself; count files with `find` not an `ls` glob; a leading-`--` pattern needs `grep -e`.
- Non-goal: this task does not change any copy — it only guards it. If it finds a violation, that is a
  bug in the owning task (06/07/08/09/10), reported back, not patched here.
- Depends on: the funnel surfaces exist (06–10). May run near the end.

## Plan
- [x] Write `scripts/funnel-donot-guard.sh` (absence-of-dark-patterns + presence-of-honest-lines +
      content-never-gated), honoring the allowed negations.
- [x] Wire an npm script / make it invocable from the audit.
- [x] verify.sh runs the guard; exits 0 on a clean tree.

## Next
- [ ] (done) Guard shipped + wired + green. If a later wave adds a funnel surface, add its path to
      `FUNNEL_FILES` (and `OFFER_CHECKOUT_FILES` if it carries the price/offer).

## Artifacts
- `scripts/funnel-donot-guard.sh` — the executable DO-NOT compliance guard.
- `package.json` — `guard:funnel` npm script.
- `tasks/wave17-13-donot-copy-compliance/verify.sh` — runs the guard, asserts exit 0.

## Log
- 2026-07-05T00:00Z mac-mini: task created by planner.
- 2026-07-05T01:40Z ClPcs-Mac-mini: wrote `scripts/funnel-donot-guard.sh` (executable). Scans the 9
  present wave-17 funnel surfaces (offer card path listed but skipped-if-missing — wave17-08 not
  shipped) for 8 dark-pattern classes: timer/countdown, phantom scarcity, fake discount, confirmshaming
  decline, «Купити» CTA, and positive subscription claim (with the «не підписка»/«Без підписки» carve-
  out). Also asserts the honest anti-subscription line IS present on offer/checkout surfaces, and the
  freemium inversion (play actions use `requirePlayableUser`, no entitlement gate on `app/actions/test.ts`).
  KEY FIX: scan comment-STRIPPED copy (perl slurp, line-numbers preserved) — checkout page's doc comment
  literally lists "no scarcity / countdown / fake-discount", which false-tripped the raw grep. Verified
  all 8 classes bite on injected violations, carve-out + comment-only tokens do NOT trip, missing files
  skip gracefully. Wired `npm run guard:funnel`. verify.sh green (exit 0).

## Verify
**Last verify:** PASS (2026-07-05T17:11:26Z)

## Evaluation
**Last evaluation:** PASS (2026-07-05T17:12:47Z)
