#!/usr/bin/env bash
# wave13-03 — Serwist SW on the webpack path: pinned deps, spike config, caching policy, sw.js emitted.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

grep -qE '"@serwist/next": *"9\.5\.11"' package.json || { echo "FAIL: @serwist/next not exact-pinned 9.5.11"; exit 1; }
grep -qE '"serwist": *"9\.5\.11"' package.json || { echo "FAIL: serwist not exact-pinned 9.5.11"; exit 1; }
grep -qE '"build": *"next build --webpack"' package.json || { echo "FAIL: build script must be 'next build --webpack'"; exit 1; }

grep -qF "withSerwistInit" next.config.ts || { echo "FAIL: next.config.ts missing withSerwistInit wrap"; exit 1; }
grep -qF "X-Frame-Options" next.config.ts || { echo "FAIL: security headers lost from next.config.ts"; exit 1; }
grep -qF "outputFileTracingRoot" next.config.ts || { echo "FAIL: workspace-root pin lost from next.config.ts"; exit 1; }

F="app/sw.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
head -1 "$F" | grep -qF '/// <reference lib="webworker" />' || { echo "FAIL: sw.ts line 1 must be the webworker reference"; exit 1; }
grep -qF "__SW_MANIFEST" "$F" || { echo "FAIL: sw.ts missing precacheEntries: self.__SW_MANIFEST"; exit 1; }
grep -qF "addEventListeners" "$F" || { echo "FAIL: sw.ts missing addEventListeners()"; exit 1; }
grep -qF "CacheFirst" "$F" || { echo "FAIL: sw.ts missing CacheFirst image rule"; exit 1; }
grep -qF "q-image" "$F" || { echo "FAIL: sw.ts image rule must target /api/q-image"; exit 1; }
grep -qF "NetworkOnly" "$F" || { echo "FAIL: sw.ts missing NetworkOnly mutation rule"; exit 1; }
grep -q "~offline" "$F" next.config.ts || { echo "FAIL: /~offline not wired into precache/fallback"; exit 1; }

# registration component: mounted in the root layout, feature-detected, client-pure
grep -qE 'sw-register|SwRegister|ServiceWorkerRegister' app/layout.tsx || { echo "FAIL: registration component not mounted in app/layout.tsx"; exit 1; }
REG="$(grep -rlE 'serviceWorker.*register|register.*sw\.js' components/ | head -1 || true)"
[ -n "$REG" ] || { echo "FAIL: no registration component found under components/"; exit 1; }
grep -qF '"serviceWorker" in navigator' "$REG" || { echo "FAIL: $REG must feature-detect serviceWorker"; exit 1; }
for tok in "@/lib/db" "@/lib/auth" "@/lib/rbac" "server-only"; do
  grep -qF "$tok" "$REG" && { echo "FAIL: server-graph import in client register component: $tok"; exit 1; }
done

git check-ignore -q public/sw.js || { echo "FAIL: public/sw.js must be gitignored"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s build || { echo "FAIL: npm run build (webpack path)"; exit 1; }
[ -f public/sw.js ] || { echo "FAIL: public/sw.js not emitted by the build"; exit 1; }
sz="$(wc -c < public/sw.js | tr -d ' ')"
[ "$sz" -gt 10240 ] || { echo "FAIL: public/sw.js suspiciously small ($sz bytes)"; exit 1; }
echo "PASS wave13-03"
