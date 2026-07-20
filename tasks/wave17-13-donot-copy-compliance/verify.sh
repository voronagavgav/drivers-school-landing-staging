#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
G=scripts/funnel-donot-guard.sh
[ -f "$G" ] || { echo "FAIL: DO-NOT guard script missing"; exit 1; }
[ -x "$G" ] || chmod +x "$G"
# the guard must consult the play-path resolver (content-never-gated check)
grep -q 'requirePlayableUser' "$G" || { echo "FAIL: guard must assert content-never-gated (requirePlayableUser)"; exit 1; }
# the guard must know the allowed negations so it does not flag honest copy
grep -q 'не підписка\|Без підписки' "$G" || { echo "FAIL: guard must carve out the allowed anti-subscription negations"; exit 1; }
# run the guard — it must pass on the current tree
bash "$G" || { echo "FAIL: DO-NOT guard reported a violation"; exit 1; }
echo "PASS: wave17-13 DO-NOT compliance guard clean"
