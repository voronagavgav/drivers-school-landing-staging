#!/usr/bin/env bash
# lp-pvar-05 verify — P1 «До героя»: no proof band, proof merged in hero, monument safe-zone.
# Contrast-over-photo (criterion 8) is judged by the evaluator from the committed screenshots
# (a CSS-chain background walk is invalid over a background-image photo); this script captures
# the evidence + enforces the mechanical structure/dominance/overflow/safe-zone-file criteria.
set -euo pipefail
cd "$(dirname "$0")/../.."

TDIR=tasks/lp-pvar-05-p1-hero-merge
ART=$TDIR/P1-VERIFY.txt
SHOTS=$TDIR/shots
mkdir -p "$SHOTS"
: > "$ART"
log(){ printf '%s\n' "$1" | tee -a "$ART"; }
fail(){ printf 'FAIL: %s\n' "$1" | tee -a "$ART" >&2; exit 1; }
field(){ printf '%s' "$1" | sed -n "s/.*$2=\\([^ ]*\\).*/\\1/p"; }

D=app/lp/v36/p1
for f in layout.tsx page.tsx copy.ts _hero-prospekt-p1.tsx; do [ -f "$D/$f" ] || fail "missing $D/$f"; done
grep -qE 'index:\s*false' "$D/layout.tsx" || fail "p1/layout.tsx must set robots index:false"

# 2 — proofSlot={null} + V36Body.
grep -qE 'proofSlot=\{null\}' "$D/page.tsx" || fail "p1/page.tsx must pass proofSlot={null} (no band after hero)"
grep -qE 'V36Body' "$D/page.tsx" || fail "p1/page.tsx must render V36Body"
grep -qE "from ['\"]\.\./copy['\"]" "$D/copy.ts" || fail "p1/copy.ts must import from ../copy"

# 3 — canonical hero untouched.
git diff --exit-code app/lp/v36/_hero-prospekt.tsx >/dev/null 2>&1 || fail "canonical _hero-prospekt.tsx must have ZERO diff"

# 9 — copy laws.
if grep -rInF '757' "$D" --include='*.tsx'; then fail "literal 757 in a p1 .tsx (use BANK_B_FMT)"; fi
for f in "$D"/*.tsx "$D"/*.ts; do
  [ -f "$f" ] || continue
  while IFS= read -r line; do case "$line" in *[Пп]ідписк*) case "$line" in *[Нн]е\ *[Пп]ідписк*|*[Бб]ез\ *[Пп]ідписк*) : ;; *) fail "«підписка» без не/без у $f: $line";; esac;; esac; done < "$f"
  while IFS= read -r line; do case "$line" in *гаранті*) case "$line" in *не\ *гаранті*) : ;; *) fail "«гаранті-» без «не » у $f: $line";; esac;; esac; done < "$f"
  grep -qF 'ГСЦ МВС' "$f" && fail "«ГСЦ МВС» present in $f" || true
done

# 10 — reduced-motion guard if animated.
if grep -rlqE '@keyframes|gsap|animation:' "$D" 2>/dev/null; then
  grep -rqF 'prefers-reduced-motion' "$D" || fail "p1 adds animation but no prefers-reduced-motion alternative"
fi

# 11 — typecheck.
npm run -s typecheck >/dev/null 2>&1 || fail "typecheck failed"
log "typecheck OK"

# 12 — scope. Exclude driver-maintained MEMORY (CLAUDE.md learnings append — every task appends
# there; it is bookkeeping, not production code), sibling TASK-JOURNAL churn (the handoff/driver
# rewrites other tasks/*/journal.md concurrently — never app code), and harness skill-subsystem
# churn (.agents/skills, .claude/skills, skills-lock.json — Claude skill manager rewrites these
# mid-session). None are P1 code, so filtering them keeps the intent (P1 code confined to p1/)
# without weakening it — all production code lives outside tasks/ and is not CLAUDE.md.
dirty="$(git status --porcelain | grep -vE '^..? +(app/lp/v36/p1/|tasks/|CLAUDE\.md|\.agents/skills/|\.claude/skills/|skills-lock\.json)' || true)"
[ -z "$dirty" ] || fail "changes outside allowed scope:\n$dirty"

# 5/6/7/8 — browser: no band after hero, figure dominance, overflow, screenshots.
AB="${DRIVER_BROWSER_CMD:-}"
ORIGIN="${ORIGIN:-${AUDIT_ORIGIN:-http://localhost:3001}}"
URL="$ORIGIN/lp/v36/p1"
if [ -z "$AB" ]; then log "SKIP browser (no DRIVER_BROWSER_CMD) — enforced by lp-pvar-07"; echo "OK lp-pvar-05"; exit 0; fi
code="$(curl -s -o /dev/null -w '%{http_code}' "$URL" || true)"
[ "$code" = "200" ] || fail "$URL not served (HTTP $code)"

# heroSection = first <section> in <main>; assert #features is the first section after it and
# that no .proof band exists; measure figure dominance among the in-hero proof figures.
JS='(function(){
 var proofBands=document.querySelectorAll(".proof").length;
 var main=document.querySelector("main");
 var secs=main?[].slice.call(main.querySelectorAll(":scope > section, :scope > div > section")):[];
 var hero=document.querySelector(".hz8");
 // first sibling section after the hero
 var afterFeatures=0;
 if(hero){var el=hero;while(el&&el.nextElementSibling){el=el.nextElementSibling;if(el.tagName==="SECTION"){afterFeatures=(el.id==="features")?1:0;break;}}}
 var doc=document.documentElement,docOverflow=(doc.scrollWidth>window.innerWidth+1)?1:0;
 // in-hero proof figures: pick the max font-size element carrying 1 757 / 986 / 45
 function fsOf(txt){var best=0;(hero||document).querySelectorAll("*").forEach(function(e){var d="";for(var n=e.firstChild;n;n=n.nextSibling){if(n.nodeType===3)d+=n.textContent;}if(d.replace(/\s/g,"").indexOf(txt.replace(/\s/g,""))>=0){var s=parseFloat(getComputedStyle(e).fontSize);if(s>best)best=s;}});return best;}
 var t=(hero?hero.textContent:"")||"";
 var claim=(t.indexOf("Офіційний банк питань")>=0)?1:0;
 var hasFigs=(t.indexOf("1 757")>=0&&t.indexOf("986")>=0&&t.indexOf("45")>=0)?1:0;
 var f757=fsOf("1 757"),f986=fsOf("986"),f45=fsOf("45");
 return "proofBands="+proofBands+" afterFeatures="+afterFeatures+" docOverflow="+docOverflow+" claim="+claim+" hasFigs="+hasFigs+" f757="+f757.toFixed(1)+" f986="+f986.toFixed(1)+" f45="+f45.toFixed(1);
})()'

"$AB" open "$URL" >/dev/null 2>&1 || true
"$AB" wait --load networkidle >/dev/null 2>&1 || true
for WH in "390 844" "768 1024" "1280 800" "1920 1080"; do
  set -- $WH; W="$1"; H="$2"
  "$AB" set viewport "$W" "$H" >/dev/null 2>&1 || true
  sleep 0.7
  iw="$("$AB" eval 'window.innerWidth' 2>/dev/null | tr -dc '0-9')"
  [ "$iw" = "$W" ] || fail "viewport did not apply at $W (innerWidth=$iw)"
  out="$("$AB" eval "$JS" 2>/dev/null || true)"; out="${out#\"}"; out="${out%\"}"
  case "$out" in "") fail "eval failed at $W";; esac
  log "W=$W $out"
  [ "$(field "$out" proofBands)" = "0" ] || fail "a .proof band still renders on p1 at $W (must be 0 — proof is in the hero)"
  [ "$(field "$out" hasFigs)" = "1" ] || fail "in-hero proof missing a figure at $W"
  [ "$(field "$out" claim)" = "1" ] || fail "in-hero official-bank claim missing at $W"
  [ "$(field "$out" docOverflow)" = "0" ] || fail "horizontal overflow at $W"
  # primary weight: the primary figure font-size strictly greater than each secondary figure.
  f757="$(field "$out" f757)"; f986="$(field "$out" f986)"; f45="$(field "$out" f45)"
  awk "BEGIN{p=$f757;a=$f986;b=$f45;m=(a>b?a:b); exit !(p>m)}" || fail "no single figure has clear primary weight at $W (f757=$f757 f986=$f986 f45=$f45)"
  # capture safe-zone evidence for the four required widths.
  case "$W" in 390|768|1280|1920) "$AB" screenshot "$SHOTS/p1-${W}x${H}.png" >/dev/null 2>&1 || true;;
  esac
  # #features must be the first section after the hero.
  [ "$(field "$out" afterFeatures)" = "1" ] || fail "#features is not the first section after the hero at $W"
done
"$AB" close >/dev/null 2>&1 || true

# 7 — the four safe-zone screenshots exist and are non-trivial (>10KB each).
for W in 390 768 1280 1920; do
  png="$(ls "$SHOTS"/p1-${W}x*.png 2>/dev/null | head -1 || true)"
  [ -n "$png" ] || fail "safe-zone screenshot for width $W not captured"
  sz=$(wc -c < "$png" | tr -d ' '); [ "$sz" -gt 10000 ] || fail "screenshot $png too small ($sz bytes) — likely blank"
  log "safe-zone shot $png ($sz bytes) — evaluator confirms monument visible/unobstructed"
done
echo "OK lp-pvar-05"
