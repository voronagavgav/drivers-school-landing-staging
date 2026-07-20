#!/usr/bin/env bash
# wave12b-16 — Карта тем grouped by band (frozen probe + page wiring).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
F="lib/topic-map.ts"
P="app/(app)/progress/page.tsx"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
if grep -nE '@/lib/db|server-only|@/lib/auth|lib/generated|Math\.random|Date\.now|new Date' "$F"; then
  echo "FAIL: $F must be pure"; exit 1; fi
if grep -nE '</|/>' "$F"; then echo "FAIL: no JSX in the pure module"; exit 1; fi
cat > ./wave12b-16-probe.mts <<'PROBE'
import { groupTopicsByBand } from "./lib/topic-map";
const t = (title: string, band: "weak" | "learning" | "strong" | null, meanR: number | null) =>
  ({ topicId: "id-" + title, title, band, meanR });
const got = groupTopicsByBand([
  t("Сильна", "strong", 0.95),
  t("Середня", "learning", 0.7),
  t("Слабка-Б", "weak", 0.5),
  t("Слабка-А", "weak", 0.3),
  t("Небачена-Б", null, null),
  t("Небачена-А", null, null),
  t("Середня-А", "learning", 0.6),
]);
const titles = (xs: Array<{ title: string }>) => xs.map(x => x.title);
const eq = (got: unknown, want: unknown, label: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) { console.error("MISMATCH", label, "want", want, "got", got); process.exitCode = 1; }
};
eq(titles(got.weak), ["Слабка-А", "Слабка-Б", "Небачена-А", "Небачена-Б"], "weak: seen by meanR asc, then unseen by title");
eq(titles(got.learning), ["Середня-А", "Середня"], "learning by meanR asc");
eq(titles(got.strong), ["Сильна"], "strong");
if (!process.exitCode) console.log("topic-map probe ok");
PROBE
npx tsx ./wave12b-16-probe.mts || { rm -f ./wave12b-16-probe.mts; echo "FAIL: frozen probe"; exit 1; }
rm -f ./wave12b-16-probe.mts
[ -f "lib/topic-map.test.ts" ] || { echo "FAIL: lib/topic-map.test.ts missing"; exit 1; }
x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -q "topic-map.test.ts" || { echo "FAIL: topic-map.test.ts not collected"; exit 1; }
# page wiring
grep -qF 'Карта тем' "$P" || { echo "FAIL: map heading missing"; exit 1; }
grep -qF 'Вивчаю' "$P" || { echo "FAIL: Вивчаю group missing"; exit 1; }
grep -qF 'Майже' "$P" || { echo "FAIL: Майже group missing"; exit 1; }
grep -qF 'Впевнено' "$P" || { echo "FAIL: Впевнено group missing"; exit 1; }
grep -qE 'TOPIC_PRACTICE' "$P" || { echo "FAIL: topic rows must start TOPIC_PRACTICE"; exit 1; }
# anti-leaderboard: no accuracy percent in the map page
if grep -nF 'Точність' "$P"; then echo "FAIL: per-topic accuracy percent must not render on the map"; exit 1; fi
npm run typecheck
npm test
npm run build
ORIGIN="${DS_AUDIT_ORIGIN:-http://100.110.64.90:3100}"
if [ -n "${DRIVER_BROWSER_CMD:-}" ] && curl -sS -m 6 -o /dev/null "$ORIGIN/login" 2>/dev/null; then
  bash bin/browser-audit.sh >/dev/null 2>&1 || { echo "FAIL: browser audit regressed"; exit 1; }
fi
echo "PASS wave12b-16"
