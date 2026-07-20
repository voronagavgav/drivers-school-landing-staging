#!/usr/bin/env bash
# lp-pvar-04 verify — P2 evidence strip: real restyled images, captions not tiles, copy laws.
set -euo pipefail
cd "$(dirname "$0")/../.."

ART=tasks/lp-pvar-04-p2-evidence-strip/P2-VERIFY.txt
: > "$ART"
log(){ printf '%s\n' "$1" | tee -a "$ART"; }
fail(){ printf 'FAIL: %s\n' "$1" | tee -a "$ART" >&2; exit 1; }
field(){ printf '%s' "$1" | sed -n "s/.*$2=\\([^ ]*\\).*/\\1/p"; }
ge(){ awk "BEGIN{exit !($1>=$2)}"; }

D=app/lp/v36/p2
for f in layout.tsx page.tsx copy.ts _proof.tsx; do [ -f "$D/$f" ] || fail "missing $D/$f"; done
grep -qE 'index:\s*false' "$D/layout.tsx" || fail "p2/layout.tsx must set robots index:false"
grep -qE 'proofSlot' "$D/page.tsx" || fail "p2/page.tsx must pass proofSlot"
grep -qE 'V36Body' "$D/page.tsx" || fail "p2/page.tsx must render V36Body"
grep -qE "from ['\"]\.\./copy['\"]" "$D/copy.ts" || fail "p2/copy.ts must import from ../copy"
grep -qE 'IMG_FMT' "$D/copy.ts" || fail "p2/copy.ts must source IMG_FMT (986)"

# 4 — ≥8 restyled sources, all real files.
refs=(); while IFS= read -r r; do [ -n "$r" ] && refs+=("$r"); done < <(grep -rhoE '/restyled-live/[0-9A-Za-z_]+\.png' "$D" | sort -u)
[ "${#refs[@]}" -ge 8 ] || fail "only ${#refs[@]} distinct /restyled-live/ images referenced (<8)"
for r in "${refs[@]}"; do [ -f "public${r}" ] || fail "referenced image does not exist: public${r}"; done
log "restyled sources referenced: ${#refs[@]} (all exist)"

# 6 — honesty: no overclaim tokens in p2 copy.
for tok in 'усі 986' 'всі 986' 'типов'; do
  if grep -rIF "$tok" "$D" ; then fail "overclaim token present in p2 copy: «$tok»"; fi
done

# 7 — fixed aspect box + lazy.
grep -qE 'aspect-ratio|width=|height=' "$D/_proof.tsx" || fail "p2 images need a fixed aspect box (aspect-ratio or width/height) — no layout shift"
grep -qE 'loading=.lazy.|next/image|from ["'\'']next/image' "$D/_proof.tsx" || fail "p2 images must lazy-load (loading=lazy or next/image)"

# 8 — copy laws.
if grep -rInF '757' "$D" --include='*.tsx'; then fail "literal 757 in a p2 .tsx (use BANK_B_FMT)"; fi
for f in "$D"/*.tsx "$D"/*.ts; do
  [ -f "$f" ] || continue
  while IFS= read -r line; do case "$line" in *[Пп]ідписк*) case "$line" in *[Нн]е\ *[Пп]ідписк*|*[Бб]ез\ *[Пп]ідписк*) : ;; *) fail "«підписка» без не/без у $f: $line";; esac;; esac; done < "$f"
  while IFS= read -r line; do case "$line" in *гаранті*) case "$line" in *не\ *гаранті*) : ;; *) fail "«гаранті-» без «не » у $f: $line";; esac;; esac; done < "$f"
  grep -qF 'ГСЦ МВС' "$f" && fail "«ГСЦ МВС» present in $f" || true
done

# 9 — reduced-motion guard if animated.
if grep -rlqE '@keyframes|gsap|animation:' "$D" 2>/dev/null; then
  grep -rqF 'prefers-reduced-motion' "$D" || fail "p2 adds animation but no prefers-reduced-motion alternative"
fi

# 10 — typecheck.
npm run -s typecheck >/dev/null 2>&1 || fail "typecheck failed"
log "typecheck OK"

# 12 — scope.
dirty="$(git status --porcelain | grep -vE '^..? +(app/lp/v36/p2/|tasks/lp-pvar-04-p2-evidence-strip/)' || true)"
[ -z "$dirty" ] || fail "changes outside allowed scope:\n$dirty"

# 11 — browser.
AB="${DRIVER_BROWSER_CMD:-}"
ORIGIN="${ORIGIN:-${AUDIT_ORIGIN:-http://localhost:3001}}"
URL="$ORIGIN/lp/v36/p2"
if [ -z "$AB" ]; then log "SKIP browser (no DRIVER_BROWSER_CMD) — enforced by lp-pvar-07"; echo "OK lp-pvar-04"; exit 0; fi
code="$(curl -s -o /dev/null -w '%{http_code}' "$URL" || true)"
[ "$code" = "200" ] || fail "$URL not served (HTTP $code)"

JS='(function(){
 function parse(c){var m=c.match(/[\d.]+/g)||[];return m.map(Number);}
 function lum(p){var a=p.slice(0,3).map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];}
 function ratio(f,b){var L1=lum(f),L2=lum(b),hi=Math.max(L1,L2),lo=Math.min(L1,L2);return (hi+0.05)/(lo+0.05);}
 function effBg(el){while(el){var p=parse(getComputedStyle(el).backgroundColor);if(p.length>=3&&!(p.length===4&&p[3]===0))return p;el=el.parentElement;}return [255,255,255];}
 var bands=document.querySelectorAll(".proof"),band=bands[0];
 if(!band)return "ERR noband";
 var imgs=band.querySelectorAll("img[src*=\"/restyled-live/\"]").length;
 var doc=document.documentElement,docOverflow=(doc.scrollWidth>window.innerWidth+1)?1:0;
 var t=band.textContent||"";
 var hasAll=(t.indexOf("986")>=0&&t.indexOf("1 757")>=0&&t.indexOf("Офіційний банк питань")>=0)?1:0;
 var minBody=99;
 band.querySelectorAll("*").forEach(function(e){var d="";for(var n=e.firstChild;n;n=n.nextSibling){if(n.nodeType===3)d+=n.textContent;}if(!d.trim())return;var cs=getComputedStyle(e),fg=parse(cs.color),bg=effBg(e),r=ratio(fg,bg),fsz=parseFloat(cs.fontSize),large=(fsz>=24)||(fsz>=18.66&&parseInt(cs.fontWeight)>=700);if(!large&&r<minBody)minBody=r;});
 return "bands="+bands.length+" imgs="+imgs+" docOverflow="+docOverflow+" hasAll="+hasAll+" minBody="+minBody.toFixed(2);
})()'

"$AB" open "$URL" >/dev/null 2>&1 || true
"$AB" wait --load networkidle >/dev/null 2>&1 || true
for WH in "390 844" "768 1024" "1440 900"; do
  set -- $WH; W="$1"; H="$2"
  "$AB" set viewport "$W" "$H" >/dev/null 2>&1 || true
  sleep 0.6
  iw="$("$AB" eval 'window.innerWidth' 2>/dev/null | tr -dc '0-9')"
  [ "$iw" = "$W" ] || fail "viewport did not apply at $W (innerWidth=$iw)"
  out="$("$AB" eval "$JS" 2>/dev/null || true)"; out="${out#\"}"; out="${out%\"}"
  case "$out" in *ERR*|"") fail "eval failed at $W: '$out'";; esac
  log "W=$W $out"
  [ "$(field "$out" bands)" = "1" ] || fail "expected exactly one .proof region at $W (got $(field "$out" bands))"
  [ "$(field "$out" docOverflow)" = "0" ] || fail "document horizontal overflow at $W"
  [ "$(field "$out" hasAll)" = "1" ] || fail "band missing 986/1 757/bank claim at $W"
  imgs="$(field "$out" imgs)"; [ "${imgs:-0}" -ge 8 ] || fail "only ${imgs:-0} restyled <img> in band at $W (<8)"
  ge "$(field "$out" minBody)" 4.5 || fail "caption body contrast < 4.5:1 at $W"
done
"$AB" close >/dev/null 2>&1 || true
echo "OK lp-pvar-04"
