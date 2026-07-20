#!/usr/bin/env bash
# wave20-08: confidence-veto / latency-cap census pinned as unit tests (no code change expected).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Census lives in a dedicated file or an added block in grade.test.ts.
F=""
for cand in lib/fsrs/confidence-veto.test.ts lib/fsrs/grade.test.ts ; do
  [ -f "$cand" ] && grep -q "confidence" "$cand" && F="$cand"
done
[ -n "$F" ] || { echo "FAIL: no confidence-veto census test found"; exit 1; }

# Purity: no literal new Date in the pure-tree test file(s).
if grep -nE 'new Date' lib/fsrs/confidence-veto.test.ts 2>/dev/null; then
  echo "FAIL: literal 'new Date' in confidence-veto test (use Reflect.construct)"; exit 1
fi

npm run -s typecheck

vitest_list() {
  local req="$1"; shift; local out ok tok toks
  IFS=',' read -ra toks <<<"$req"
  for _ in 1 2 3 4 5; do
    out="$(npx vitest list 2>/dev/null || true)"; ok=1
    for tok in "${toks[@]}"; do grep -q "$tok" <<<"$out" || ok=0; done
    [ "$ok" = 1 ] && break
  done
  printf '%s\n' "$out"
}
# grade.test.ts is always collected; if a dedicated file exists, require it too.
if [ -f lib/fsrs/confidence-veto.test.ts ]; then
  LIST="$(vitest_list 'confidence-veto')"
  grep -q 'confidence-veto' <<<"$LIST" || { echo "FAIL: confidence-veto test not collected"; exit 1; }
fi

npm run -s test

echo "PASS: wave20-08"
