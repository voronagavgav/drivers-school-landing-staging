#!/usr/bin/env bash
# lp-proof-03 verify — drive the REAL served /lp/v36 across 3 widths; assert no overflow,
# no clipping, figures+chip render, and WCAG contrast. Tees evidence to BROWSER-VERIFY.txt.
set -euo pipefail
cd "$(dirname "$0")/../.."

ART=tasks/lp-proof-03-browser-verify/BROWSER-VERIFY.txt
: > "$ART"
log(){ printf '%s\n' "$1" | tee -a "$ART"; }
fail(){ printf 'FAIL: %s\n' "$1" | tee -a "$ART" >&2; exit 1; }
field(){ printf '%s' "$1" | sed -n "s/.*$2=\\([^ ]*\\).*/\\1/p"; }
ge(){ awk "BEGIN{exit !($1>=$2)}"; }   # float >= compare

AB="${DRIVER_BROWSER_CMD:-}"
[ -n "$AB" ] || fail "DRIVER_BROWSER_CMD not set — a UI task cannot be verified without a live browser"
ORIGIN="${ORIGIN:-${AUDIT_ORIGIN:-http://localhost:3001}}"
URL="$ORIGIN/lp/v36"
log "# lp-proof-03 browser verify — $URL"

code="$(curl -s -o /dev/null -w '%{http_code}' "$URL" || true)"
[ "$code" = "200" ] || fail "/lp/v36 not served (HTTP $code) at $ORIGIN — serve the app on the fresh build first"

# Single eval measuring overflow / clipping / render / contrast inside the `.proof` band.
JS='(function(){
 function parse(c){var m=c.match(/[\d.]+/g)||[];return m.map(Number);}
 function lum(p){var a=p.slice(0,3).map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];}
 function ratio(f,b){var L1=lum(f),L2=lum(b);var hi=Math.max(L1,L2),lo=Math.min(L1,L2);return (hi+0.05)/(lo+0.05);}
 function effBg(el){while(el){var c=getComputedStyle(el).backgroundColor;var p=parse(c);if(p.length>=3&&!(p.length===4&&p[3]===0))return p;el=el.parentElement;}return [255,255,255];}
 var band=document.querySelector(".proof");
 if(!band)return "ERR noband";
 var doc=document.documentElement;
 var docOverflow=(doc.scrollWidth>window.innerWidth+1)?1:0;
 var bandOverflow=0;
 band.querySelectorAll("*").forEach(function(e){if(e.scrollWidth>e.clientWidth+2)bandOverflow=1;});
 var t=band.textContent||"";
 var hasAll=(t.indexOf("1 757")>=0&&t.indexOf("986")>=0&&t.indexOf("45")>=0&&t.indexOf("Офіційний банк питань")>=0)?1:0;
 var minBody=99,minLarge=99;
 band.querySelectorAll("*").forEach(function(e){
   var direct="";for(var n=e.firstChild;n;n=n.nextSibling){if(n.nodeType===3)direct+=n.textContent;}
   if(!direct.trim())return;
   var cs=getComputedStyle(e);var fg=parse(cs.color);var bg=effBg(e);
   var r=ratio(fg,bg);var fs=parseFloat(cs.fontSize);var bold=(parseInt(cs.fontWeight)>=700);
   var large=(fs>=24)||(fs>=18.66&&bold);
   if(large){if(r<minLarge)minLarge=r;}else{if(r<minBody)minBody=r;}
 });
 return "iw="+window.innerWidth+" docOverflow="+docOverflow+" bandOverflow="+bandOverflow+" hasAll="+hasAll+" minBody="+minBody.toFixed(2)+" minLarge="+minLarge.toFixed(2);
})()'

"$AB" open "$URL" >/dev/null 2>&1 || true
"$AB" wait --load networkidle >/dev/null 2>&1 || true

for WH in "390 844" "768 1024" "1440 900"; do
  set -- $WH; W="$1"; H="$2"
  "$AB" set viewport "$W" "$H" >/dev/null 2>&1 || true
  sleep 0.6
  iw="$("$AB" eval 'window.innerWidth' 2>/dev/null | tr -dc '0-9')"
  [ "$iw" = "$W" ] || fail "viewport did not apply at $W (innerWidth=$iw)"
  out="$("$AB" eval "$JS" 2>/dev/null || true)"
  out="${out#\"}"; out="${out%\"}"   # agent-browser eval wraps its string result in double quotes; strip them so field()/ge parse clean numbers
  case "$out" in *ERR*|"") fail "band not found / eval failed at $W: '$out'";; esac
  doO="$(field "$out" docOverflow)"; baO="$(field "$out" bandOverflow)"
  has="$(field "$out" hasAll)"; mb="$(field "$out" minBody)"; ml="$(field "$out" minLarge)"
  log "ok W=$W $out"
  [ "$doO" = "0" ] || fail "horizontal overflow at $W (docOverflow=1)"
  [ "$baO" = "0" ] || fail "clipped/overflowing text inside band at $W (bandOverflow=1)"
  [ "$has" = "1" ] || fail "band missing a figure or the chip claim at $W (hasAll=0)"
  ge "$mb" 4.5 || fail "band body-text contrast below 4.5:1 at $W (minBody=$mb)"
  ge "$ml" 3.0 || fail "band large-text contrast below 3:1 at $W (minLarge=$ml)"
done

"$AB" close >/dev/null 2>&1 || true
log "OK lp-proof-03"
