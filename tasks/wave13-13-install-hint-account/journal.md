# Task: wave13-13-install-hint-account

**Status:** done
**Driver:** auto
**Updated:** 2026-07-02
**Last compute:** mac-mini

## Goal
The calm install hint card on /account (spec §B): browser-appropriate, dismissable, remembered —
NEVER a nag. PASS = ALL true:

1. `components/install-hint.tsx` (client component) exists and is rendered from
   `app/(app)/account/page.tsx` (inside a `Card`, BELOW the existing study-settings cards).
2. Visibility logic (each branch greppable):
   - renders NOTHING when `matchMedia("(display-mode: standalone)")` matches (already installed);
   - renders NOTHING when `localStorage` key `ds_install_hint_dismissed` is `"1"`;
   - Android/Chromium lane: captures the `beforeinstallprompt` event (preventDefault + stash), shows
     a button labeled «Встановити застосунок» that calls the stashed `prompt()`;
   - iOS Safari lane (userAgent iPhone/iPad/iPod AND no stashed prompt): shows short instructions
     titled «Додати на головний екран» (Поділитися → На початковий екран), no button pretending to
     install;
   - NEITHER signal (desktop Firefox etc.): renders NOTHING — silence beats a useless card.
3. A quiet dismiss affordance «Приховати» writes `ds_install_hint_dismissed = "1"` — the card never
   returns on that device.
4. Grep gates on the component: `beforeinstallprompt`, `Додати на головний екран`,
   `Встановити застосунок`, `ds_install_hint_dismissed`, `display-mode: standalone`, `Приховати`.
5. No server-graph imports in the client file (grep: no `@/lib/db`, `@/lib/auth`, `@/lib/rbac`,
   `server-only`).
6. `npm run typecheck` exits 0; `npm test` exits 0.
7. Browser smoke (server permitting): `$DRIVER_BROWSER_CMD` login → /account → the page still renders
   its existing content (eval textContent contains «Щоденна ціль» or the account heading) — the hint
   card being absent on desktop chromium is CORRECT behavior, assert no-crash not presence.
8. `bash tasks/wave13-13-install-hint-account/verify.sh` exits 0.

## Constraints / decisions
- `beforeinstallprompt` is Chromium-only and unsupported on iOS Safari — that's WHY the two lanes
  exist (05-tech-architecture §4.3). Never fake the Android prompt on iOS.
- localStorage (not a cookie/DB): device-scoped memory is the honest scope for an install hint.
- DESIGN CRAFT (unattended implementer): copy is design material — the card explains the BENEFIT in
  one line (offline access, home-screen speed), active verbs, no marketing fluff; ONE bold element
  (the install button); dismiss is quiet text-button; card sits last on the page; visible focus on
  both actions; no animation (reduced-motion trivially satisfied).
- Non-Goals: no install analytics event, no nav/dashboard hints, no SW coupling (the card renders
  independently of SW state).

## Plan
- [x] Component + lanes + dismiss; mount on /account; typecheck; verify.sh.

## Done
- [x] `components/install-hint.tsx` written (standalone/dismissed guards, android/ios lanes,
      «Приховати» dismiss) and mounted last on /account; verify.sh green; browser smoke green.

## Next
- (none — Goal met)

## Artifacts
- components/install-hint.tsx — the hint card (owns its own `Card` so the page never shows an
  empty shell when the hint is hidden)
- app/(app)/account/page.tsx — `<InstallHint />` mounted below the last settings card

## Log
- 2026-07-02 planner: task authored from spec §B (hint = invitation with memory, never a nag).
- 2026-07-02 15:56Z ClPcs-Mac-mini: wrote components/install-hint.tsx — all detection in a mount
  useEffect (SSR renders null, no hydration mismatch): standalone matchMedia guard →
  ds_install_hint_dismissed localStorage guard → iOS UA lane («Додати на головний екран»
  instructions, no fake button) with beforeinstallprompt (preventDefault + stash) overriding to the
  android lane (primary «Встановити застосунок» → stashed prompt(), single-use, hides card without
  writing the dismiss key so a declined dialog isn't silenced forever); quiet text «Приховати»
  writes the key. Design note: the component owns its Card and returns null otherwise — mounting a
  page-level Card wrapper would render an empty solid card in the (correct) hidden state; the page
  gate only greps for InstallHint, satisfied. verify.sh PASS (grep gates, no server-graph imports,
  typecheck 0, 517 unit tests 0). Goal 7 smoke done honestly: rebuilt + restarted the :3100 LAN
  server (stale-server trap), agent-browser login → /account renders («Акаунт», «Денна ціль»),
  hint absent on desktop chromium as spec'd. Status → done.

## Verify
**Last verify:** PASS (2026-07-02T15:57:36Z)

## Evaluation
**Last evaluation:** PASS (2026-07-02T15:58:25Z)
