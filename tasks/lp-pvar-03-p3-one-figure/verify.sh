#!/usr/bin/env bash
# lp-pvar-03 verify — P3 «Одна цифра»: noindex route, one dominant numeral, copy laws, browser.
set -euo pipefail
cd "$(dirname "$0")/../.."

ART=tasks/lp-pvar-03-p3-one-figure/P3-VERIFY.txt
: > "$ART"
log(){ printf '%s\n' "$1" | tee -a "$ART"; }
fail(){ printf 'FAIL: %s\n' "$1" | tee -a "$ART" >&2; exit 1; }
field(){ printf '%s' "$1" | sed -n "s/.*$2=\\([^ ]*\\).*/\\1/p"; }
ge(){ awk "BEGIN{exit !($1>=$2)}"; }

D=app/lp/v36/p3
# 1 — files + noindex.
for f in layout.tsx page.tsx copy.ts _proof.tsx; do [ -f "$D/$f" ] || fail "missing $D/$f"; done
grep -qE 'index:\s*false' "$D/layout.tsx" || fail "p3/layout.tsx must set robots index:false"
grep -qE 'robots' "$D/layout.tsx" || fail "p3/layout.tsx must export robots metadata"

# 2 — page wires proofSlot + V36Body + HeroProspekt.
grep -qE 'proofSlot' "$D/page.tsx" || fail "p3/page.tsx must pass proofSlot"
grep -qE 'V36Body' "$D/page.tsx" || fail "p3/page.tsx must render V36Body"

# 3 — copy imports shared constants.
grep -qE "from ['\"]\.\./copy['\"]" "$D/copy.ts" || fail "p3/copy.ts must import from ../copy"
grep -qE 'BANK_B_FMT' "$D/copy.ts" || fail "p3/copy.ts must source BANK_B_FMT"

# 6 — copy laws over ALL new p3 files.
if grep -rInF '757' "$D" --include='*.tsx' ; then fail "literal 757 present in a p3 .tsx (use BANK_B_FMT)"; fi
for f in "$D"/*.tsx "$D"/*.ts; do
  [ -f "$f" ] || continue
  # підписка only with не/без on same line
  while IFS= read -r line; do
    case "$line" in *[Пп]ідписк*) case "$line" in *[Нн]е\ *[Пп]ідписк*|*[Бб]ез\ *[Пп]ідписк*) : ;; *) fail "«підписка» without не/без on same line in $f: $line";; esac;; esac
  done < "$f"
  # гаранті only with не on same line
  while IFS= read -r line; do
    case "$line" in *гаранті*) case "$line" in *не\ *гаранті*) : ;; *) fail "«гаранті-» without «не » on same line in $f: $line";; esac;; esac
  done < "$f"
  grep -qF 'ГСЦ МВС' "$f" && fail "«ГСЦ МВС» present in $f" || true
done

# 7 — reduced-motion guard if any animation added.
if grep -rlqE '@keyframes|gsap|animation:' "$D" 2>/dev/null; then
  grep -rqF 'prefers-reduced-motion' "$D" || fail "p3 adds animation but no prefers-reduced-motion alternative"
fi

# 8 — typecheck.
npm run -s typecheck >/dev/null 2>&1 || fail "typecheck failed"
log "typecheck OK"

# 10 — scope.
dirty="$(git status --porcelain | grep -vE '^..? +(app/lp/v36/p3/|tasks/lp-pvar-03-p3-one-figure/)' || true)"
[ -z "$dirty" ] || fail "changes outside allowed scope:\n$dirty"

# 4/5/9 — browser (best-effort; hard-fails if origin reachable).
AB="${DRIVER_BROWSER_CMD:-}"
ORIGIN="${ORIGIN:-${AUDIT_ORIGIN:-http://localhost:3001}}"
URL="$ORIGIN/lp/v36/p3"
if [ -z "$AB" ]; then log "SKIP browser (no DRIVER_BROWSER_CMD) — enforced by lp-pvar-07"; echo "OK lp-pvar-03"; exit 0; fi
code="$(curl -s -o /dev/null -w '%{http_code}' "$URL" || true)"
[ "$code" = "200" ] || fail "$URL not served (HTTP $code)"

JS='(function(){
 function parse(c){var m=c.match(/[\d.]+/g)||[];return m.map(Number);}
 function lum(p){var a=p.slice(0,3).map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];}
 function ratio(f,b){var L1=lum(f),L2=lum(b),hi=Math.max(L1,L2),lo=Math.min(L1,L2);return (hi+0.05)/(lo+0.05);}
 function effBg(el){while(el){var p=parse(getComputedStyle(el).backgroundColor);if(p.length>=3&&!(p.length===4&&p[3]===0))return p;el=el.parentElement;}return [255,255,255];}
 function fsOf(txt){var best=0;document.querySelectorAll(".proof *").forEach(function(e){var d="";for(var n=e.firstChild;n;n=n.nextSibling){if(n.nodeType===3)d+=n.textContent;}if(d.replace(/\s/g,"").indexOf(txt.replace(/\s/g,""))>=0){var s=parseFloat(getComputedStyle(e).fontSize);if(s>best)best=s;}});return best;}
 var bands=document.querySelectorAll(".proof");
 var band=bands[0];
 if(!band)return "ERR noband";
 var doc=document.documentElement,docOverflow=(doc.scrollWidth>window.innerWidth+1)?1:0,bandOverflow=0;
 band.querySelectorAll("*").forEach(function(e){if(e.scrollWidth>e.clientWidth+2)bandOverflow=1;});
 var t=band.textContent||"";
 var hasAll=(t.indexOf("1 757")>=0&&t.indexOf("986")>=0&&t.indexOf("45")>=0&&t.indexOf("Офіційний банк питань")>=0)?1:0;
 var fsBig=fsOf("1 757"),fsSmall=fsOf("986");
 var minBody=99,minLarge=99;
 band.querySelectorAll("*").forEach(function(e){var d="";for(var n=e.firstChild;n;n=n.nextSibling){if(n.nodeType===3)d+=n.textContent;}if(!d.trim())return;var cs=getComputedStyle(e),fg=parse(cs.color),bg=effBg(e),r=ratio(fg,bg),fsz=parseFloat(cs.fontSize),large=(fsz>=24)||(fsz>=18.66&&parseInt(cs.fontWeight)>=700);if(large){if(r<minLarge)minLarge=r;}else{if(r<minBody)minBody=r;}});
 return "bands="+bands.length+" docOverflow="+docOverflow+" bandOverflow="+bandOverflow+" hasAll="+hasAll+" fsBig="+fsBig.toFixed(1)+" fsSmall="+fsSmall.toFixed(1)+" minBody="+minBody.toFixed(2)+" minLarge="+minLarge.toFixed(2);
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
  [ "$(field "$out" bands)" = "1" ] || fail "expected exactly one .proof region at $W (got $(field "$out" bands)) — no duplicate default band"
  [ "$(field "$out" docOverflow)" = "0" ] || fail "horizontal overflow at $W"
  [ "$(field "$out" bandOverflow)" = "0" ] || fail "numeral/band overflow at $W"
  [ "$(field "$out" hasAll)" = "1" ] || fail "band missing a figure or the bank claim at $W"
  fb="$(field "$out" fsBig)"; fsm="$(field "$out" fsSmall)"
  ge "$fsm" 0.1 || fail "'986' subordinate prose not found at $W"
  ge "$fb" "$(awk "BEGIN{print $fsm*2}")" || fail "'1 757' not ≥2× the '986' font-size at $W (fsBig=$fb fsSmall=$fsm) — not hero-scale dominant"
  ge "$(field "$out" minBody)" 4.5 || fail "body contrast < 4.5:1 at $W"
  ge "$(field "$out" minLarge)" 3.0 || fail "large contrast < 3:1 at $W"
done
"$AB" close >/dev/null 2>&1 || true
echo "OK lp-pvar-03"
