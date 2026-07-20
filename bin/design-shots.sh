#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# design-shots.sh — capture the Wave-12a UI across both breakpoints for Danil.
#
# These are REVIEW screenshots, NOT a hard gate (spec §E): they let Danil eyeball
# the glass restyle on a real phone width (390×844) and a real desktop width
# (1440×900). It shares browser-audit.sh's helper style (ORIGIN arg, AB var,
# login()/nav()) and drives the SAME agent-browser CLI over the real transport.
#
# Screens captured per viewport: login (logged out), dashboard, practice,
# the live runner (a real /test/<id>), the result page, and mistakes → PNGs
# land under /tmp/design-shots/ named <screen>-<w>x<h>.png.
#
# Usage:   bin/design-shots.sh [ORIGIN]
#   ORIGIN  default http://100.110.64.90:3100  (override for LAN/HTTPS)
# Env:     DS_USER / DS_PASS  (seeded demo creds)
# Exit:    0 = ran (best-effort; missing screens are logged, not fatal).
# ---------------------------------------------------------------------------
set -u

ORIGIN="${1:-http://100.110.64.90:3100}"
AB="${DRIVER_BROWSER_CMD:-agent-browser}"
USER_EMAIL="${DS_USER:-user@drivers.school}"
USER_PASS="${DS_PASS:-User12345}"

OUTDIR="${DS_SHOTS_OUT:-/tmp/design-shots}"
mkdir -p "$OUTDIR"

# Two review breakpoints: phone and desktop.
PHONE_W=390;  PHONE_H=844
DESK_W=1440;  DESK_H=900

say() { printf '%s\n' "$*"; }

url()  { "$AB" get url 2>/dev/null; }
# nav: navigate AND wait for the page to settle before screenshotting.
nav()  { "$AB" open "$1" >/dev/null 2>&1; "$AB" wait --load networkidle >/dev/null 2>&1; }
# shot <screen>: RE-ASSERT the viewport, verify the rendered width, then capture (wave12b-review:
# `set viewport` on a cold start / across navigations silently didn't stick, so desktop layouts
# landed in 390-named files twice; the width assert turns that silent lie into a visible skip).
shot() {
  "$AB" set viewport "$W" "$H" >/dev/null 2>&1
  sleep 0.4   # give responsive layout a beat to recompute at the new width
  local got
  got="$("$AB" eval 'window.innerWidth' 2>/dev/null | tr -dc '0-9')"
  if [ -n "$got" ] && [ "$got" != "$W" ]; then
    say "  SKIP  $1-${W}x${H}.png — rendered width $got != $W (viewport did not apply)"
    return 1
  fi
  "$AB" screenshot "$OUTDIR/$1-${W}x${H}.png" >/dev/null 2>&1 && say "  shot  $1-${W}x${H}.png"
}

login() {  # login <email> <pass>
  nav "$ORIGIN/login"
  "$AB" wait --text "Вхід" >/dev/null 2>&1
  "$AB" find label "Електронна пошта" fill "$1" >/dev/null 2>&1
  "$AB" find label "Пароль" fill "$2" >/dev/null 2>&1
  "$AB" find role button click --name "Увійти" >/dev/null 2>&1
  "$AB" wait --load networkidle >/dev/null 2>&1
}

# capture_at <W> <H>: full screen tour at one viewport.
capture_at() {
  W="$1"; H="$2"
  # A page must EXIST before sizing (cold-start race): open the origin first, then size, then the
  # per-screen navs re-assert via shot().
  "$AB" open "$ORIGIN/login" >/dev/null 2>&1
  "$AB" set viewport "$W" "$H" >/dev/null 2>&1

  # 1. login — logged out, so the sign-in form renders.
  nav "$ORIGIN/login"; shot login

  # 2. authed shell.
  login "$USER_EMAIL" "$USER_PASS"
  nav "$ORIGIN/dashboard"; shot dashboard
  nav "$ORIGIN/practice";  shot practice

  # 3. the live runner: start a practice session → /test/<id>.
  nav "$ORIGIN/practice"
  sleep 2   # let the "Почати" submit button hydrate before we click it
  "$AB" find role button --name "Почати" first click >/dev/null 2>&1
  "$AB" wait --load networkidle >/dev/null 2>&1
  case "$(url)" in *"/test/"*) shot runner ;; *) say "  skip  runner (no session started)" ;; esac

  # 4. result: answer + finish the runner to reach /test/<id>/result (best-effort).
  "$AB" find role radio click >/dev/null 2>&1
  sleep 1
  "$AB" find text "Завершити" click >/dev/null 2>&1
  "$AB" find text "Завершити" click >/dev/null 2>&1   # confirm step
  "$AB" wait --load networkidle >/dev/null 2>&1
  case "$(url)" in *"/result"*) shot result ;; *) say "  skip  result (runner not finished)" ;; esac

  # 5. mistakes.
  nav "$ORIGIN/mistakes"; shot mistakes
}

say "=== Drivers School design shots ==="
say "origin: $ORIGIN  out: $OUTDIR"

# server reachable AND serving THIS app? (content-aware gate — wave12a-review: a bare size check
# passed on error-page/stale-server screenshots; a dead origin must abort, not ship garbage PNGs)
login_html="$(curl -sS -m 8 "$ORIGIN/login" || true)"
if ! printf '%s' "$login_html" | grep -q "Вхід"; then
  say "origin $ORIGIN is not serving the app login page (marker «Вхід» missing) — refusing to shoot"
  exit 1
fi

capture_at "$PHONE_W" "$PHONE_H"
capture_at "$DESK_W"  "$DESK_H"

"$AB" close --all >/dev/null 2>&1

n="$(find "$OUTDIR" -maxdepth 1 -name '*.png' 2>/dev/null | wc -l | tr -d ' ')"
say "=== design shots: $n PNG(s) under $OUTDIR ==="
