#!/usr/bin/env bash
# program.sh — autonomously advance the Drivers School improvement program by ONE wave per run.
#
# Built for launchd: a lock prevents overlap, so firing on a short interval self-paces — one wave
# runs to completion, the next fire picks up the following wave. ALL safeguards live HERE, not in
# human prompts: STOP kill-switch, clean-tree gate, independent green-gate, per-wave fail cap,
# total-wave backstop, and CONVERGENCE — when the planned backlog is empty it re-audits and only
# unaddressed High/Critical findings generate a new wave (capped); otherwise it stops with no spend.
#
# Kill switch:  touch ~/drivers-school/.program/STOP   (rm it to resume)  |  or unload the launchd job.
set -uo pipefail
PROJ="$HOME/drivers-school"; cd "$PROJ" || exit 1
export MESA_PROJECT="$PROJ"
HARNESS="$HOME/mesa/bin"
D="$PROJ/.program"; mkdir -p "$D"
LOG="$D/program.log"; STATE="$D/done"; LOCK="$D/lock"; MAN="$D/manifest"; AUTO="$D/auto-cycles"; STOP="$D/STOP"
MAX_TOTAL_WAVES=8        # runaway backstop
MAX_AUTO_CYCLES=2        # at most this many self-generated waves after the planned ones
BRANCH="${PROGRAM_BRANCH:-program/auto}"   # branch isolation (adopted from Ralph): keep main pristine
CLAUDE_BIN="${CLAUDE_BIN:-claude}"

ts(){ date -u +%Y-%m-%dT%H:%M:%SZ; }
log(){ printf '%s [program] %s\n' "$(ts)" "$*" >>"$LOG"; }

[ -f "$STOP" ] && { log "STOP flag present — idle"; exit 0; }

# seed manifest once (Wave 1 was done by hand, so it's not listed)
[ -f "$MAN" ] || printf '%s\n' \
  "specs/wave2-ux.md:wave2-ux" \
  "specs/wave3-features.md:wave3-feat" \
  "specs/wave4-testing.md:wave4-test" >"$MAN"
touch "$STATE"

# lock: bail if a run is already in progress
mkdir "$LOCK" 2>/dev/null || exit 0
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

# clean-tree gate (.program/ is gitignored, so our own logs/state don't count as dirty)
[ -z "$(git status --porcelain)" ] || { log "tree dirty — refusing to run; resolve manually"; exit 1; }

# Branch isolation (adopted from the Ralph pattern): autonomous commits land on a dedicated branch so
# `main` stays pristine and the whole run is reviewable/revertable/mergeable.
cur=$(git symbolic-ref --short HEAD 2>/dev/null || echo main)
if [ "$cur" != "$BRANCH" ]; then
  git rev-parse --verify "$BRANCH" >/dev/null 2>&1 || git branch "$BRANCH"
  git checkout "$BRANCH" >>"$LOG" 2>&1 || { log "cannot switch to $BRANCH — stopping"; exit 1; }
  log "on isolation branch $BRANCH (from $cur)"
fi

[ "$(grep -c . "$STATE" 2>/dev/null || echo 0)" -ge "$MAX_TOTAL_WAVES" ] && { log "MAX_TOTAL_WAVES reached — stopping"; exit 0; }

# pick the next manifest wave not yet recorded done
next=""
while IFS= read -r line; do
  [ -z "$line" ] && continue
  grep -qxF "${line##*:}" "$STATE" && continue
  next="$line"; break
done <"$MAN"

# backlog exhausted -> re-audit; extend only on unaddressed High/Critical, capped
if [ -z "$next" ]; then
  ac=$(cat "$AUTO" 2>/dev/null || echo 0)
  [ "$ac" -ge "$MAX_AUTO_CYCLES" ] && { log "backlog done + auto-cap reached — CONVERGED, stopping"; exit 0; }
  n=$((ac+1)); spec="specs/auto-${n}.md"; prefix="auto-${n}"
  log "backlog empty — re-auditing for unaddressed High/Critical (auto cycle $n)"
  verdict=$("$CLAUDE_BIN" -p "You are the program auditor for this repo. Read PLAN.md, AUDIT.md, and git log to see what is already done. Re-audit security/correctness/UX for UNADDRESSED High/Critical issues only. Rewrite AUDIT.md with current findings. IF there are unaddressed High/Critical items worth a wave: write the file '$spec' with boolean acceptance criteria to fix the top 3-5 (keep core logic pure + unit-tested; final criterion: 'npm run build' passes; no schema change without migrate deploy), then print exactly the token EXTEND on its own line. ELSE print exactly the token CONVERGED. Do NOT edit any source code; only AUDIT.md and possibly '$spec'." --dangerously-skip-permissions 2>>"$LOG" | tr -d '\r')
  if printf '%s' "$verdict" | grep -q EXTEND && [ -f "$spec" ]; then
    echo "${spec}:${prefix}" >>"$MAN"; echo "$n" >"$AUTO"
    git add -A && git -c commit.gpgsign=false commit -q -m "program: auto-audit generated wave $prefix" || true
    log "extended: queued $prefix"; next="${spec}:${prefix}"
  else
    git add -A && git -c commit.gpgsign=false commit -q -m "program: re-audit — no actionable High/Critical (converged)" || true
    log "no actionable High/Critical — CONVERGED, stopping"; exit 0
  fi
fi

spec="${next%%:*}"; prefix="${next##*:}"
fails=$(cat "$D/fails-$prefix" 2>/dev/null || echo 0)
[ "$fails" -ge 2 ] && { log "wave $prefix failed ${fails}x — stopping for human review"; exit 1; }

log "=== WAVE $prefix START (spec $spec) ==="
if ! ls -d tasks/${prefix}-* >/dev/null 2>&1; then
  "$HARNESS/plan.sh" "$spec" "$prefix" >>"$LOG" 2>&1 || { echo $((fails+1)) >"$D/fails-$prefix"; log "PLAN FAILED"; exit 1; }
fi
DRIVER_EVALUATE=1 "$HARNESS/driver.sh" run-all >>"$LOG" 2>&1 || true   # independent verify below is the real gate

log "verifying $prefix (typecheck + test + integration + build)"
if npm run -s typecheck >>"$LOG" 2>&1 \
   && npm run -s test >>"$LOG" 2>&1 \
   && npm run -s test:integration >>"$LOG" 2>&1 \
   && npm run -s build >>"$LOG" 2>&1; then
  echo "$prefix" >>"$STATE"; rm -f "$D/fails-$prefix"
  git add -A && git -c commit.gpgsign=false commit -q -m "program: wave $prefix verified GREEN (auto)" || true
  log "=== WAVE $prefix GREEN + recorded ==="
else
  echo $((fails+1)) >"$D/fails-$prefix"
  git add -A && git -c commit.gpgsign=false commit -q -m "program: wave $prefix (verify RED — not recorded)" || true
  log "=== WAVE $prefix VERIFY FAILED (fail #$((fails+1))) — stopping for review ==="
  exit 1
fi
