# Task: wave14-04-nudge-card-dashboard

**Status:** done
**Driver:** auto
**Updated:** 2026-07-03T01:20Z
**Last compute:** mac-mini

## Goal
Dashboard renders the day's nudge as ONE quiet dismissible card (spec §A UI). Depends on wave14-03.
PASS = ALL true:

1. `app/(app)/dashboard/page.tsx` calls `computeDueNudges(user.id)` and, when non-null, renders a
   `NudgeCard` component (new file `components/nudge-card.tsx`) ABOVE the recommended-action card but
   NOT above the readiness dial hero (the dial stays the screen's one bold element — wave12b design law).
2. Copy per kind lives in a single map in the component file — pinned strings (Ukrainian, ZERO emoji,
   calm, no guilt/FOMO):
   - REVIEW_DUE: «Є картки на повторення — {n} чекають. 10 хвилин вистачить.» (n rendered from due
     count if cheaply available, else the count-free variant «Є картки на повторення. 10 хвилин вистачить.»)
   - EXAM_COUNTDOWN: «До іспиту лишилось небагато. Один спокійний підхід сьогодні — краще, ніж марафон завтра.»
   - DAY_OFF_OFFER (first-person Світлик, the ONLY first-person kind): «Ви вчора виконали план. Якщо
     сьогодні без сил — візьміть вихідний, я збережу ваш поступ.»
   - READINESS_MILESTONE: «Готовність зросла. Подивіться на карту тем — видно, що спрацювало.»
3. Dismiss is a REAL server action path: a `<form>` whose action is an inline-`"use server"` wrapper in
   the page (wave12b-14 pattern) calling `dismissNudge(user.id, id)`; after dismiss the page re-renders
   WITHOUT the card (revalidatePath or redirect — either, as long as the card is gone on next render).
   Dismiss button label: «Зрозуміло» (persists as the action name).
4. `UserSettings.notif*` toggles are respected — no new code needed here (the policy already gates);
   assert via the wave14-03 integration test, NOT re-tested here.
5. Zero-emoji gate: `components/nudge-card.tsx` contains NO character outside a pinned safe set
   (verify.sh runs a perl rune-class check for emoji/pictographs).
6. The card is quiet: no `variant="primary"` button, no animation classes (`animate-`), no `border-warn`
   / alarm colors in the component (grep gates).
7. Browser sanity (only if the LAN server is already running — else skip, wave14-14 owns the full
   audit): `$DRIVER_BROWSER_CMD` login as seeded user → /dashboard renders (dial copy present). The
   card may legitimately be absent for the seeded user; the POSITIVE card render with a seeded due
   review is wave14-14's assertion, not this task's.
8. `npm run typecheck` exits 0; `npm test` exits 0; `npm run build` exits 0.
9. `bash tasks/wave14-04-nudge-card-dashboard/verify.sh` exits 0.

## Constraints / decisions
- CRAFT RULES (unattended implementer — apply, don't reinterpret): copy is design material (active
  verbs; the dismiss action keeps its name «Зрозуміло» through the flow); boldness stays with the
  readiness dial — this card is deliberately quiet; no new structural devices (no numbering/eyebrows);
  quality floor: keyboard-focusable dismiss button with visible focus ring, `prefers-reduced-motion`
  irrelevant (no motion at all).
- NudgeCard is a SERVER component (no "use client") — dismiss works via the form action; do not import
  lib/server/* into any client file (client-bundle trap).
- Copy strings pinned above so verify.sh can grep them; if the due-count variant is dropped, use the
  count-free REVIEW_DUE string EXACTLY.
- No emoji ever in nudge surfaces (tone law, grep-gated here AND in wave14-15).

## Next
- [x] Read wave14-01 Findings (1a), wave14-03 journal; then add the card + inline dismiss wrapper.
- Goal met: `components/nudge-card.tsx` (quiet server component, pinned copy map, ghost dismiss
  button «Зрозуміло») + dashboard wiring (computeDueNudges call, inline "use server" dismiss wrapper
  scoped to user.id + revalidatePath, card rendered below dial hero / above recommended-action).
  verify.sh PASS (typecheck + npm test + build all green).

## Artifacts
- components/nudge-card.tsx, app/(app)/dashboard/page.tsx (nudge slot + dismiss wrapper)

## Log
- 2026-07-02T20:43Z planner: task created.
- 2026-07-03T01:20Z ClPcs-Mac-mini driver: created components/nudge-card.tsx — SERVER component,
  single `NUDGE_COPY: Record<NudgeKind,string>` map with the four pinned Ukrainian strings (count-free
  REVIEW_DUE variant, DAY_OFF_OFFER the only first-person kind), quiet `<Card>` + ghost SubmitButton
  «Зрозуміло» dismiss form (no primary/animation/alarm border). Wired the dashboard page: import
  computeDueNudges/dismissNudge + NudgeCard, `const nudge = await computeDueNudges(user.id)`, inline
  `async function dismissNudgeAction(formData){ "use server"; … dismissNudge(user.id, id); revalidatePath("/dashboard") }`
  closing over user.id, and `{nudge && <NudgeCard …/>}` placed below the readiness-dial hero and above
  the recommended-action card. Full verify.sh PASS. Status: done.

## Verify
**Last verify:** PASS (2026-07-02T21:16:42Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T21:17:53Z)
