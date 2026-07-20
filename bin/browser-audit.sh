#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# browser-audit.sh — REAL-TRANSPORT runtime smoke for Drivers School.
#
# This is the gate the static checks (typecheck/test/build) and the
# curl-minted-cookie smoke could NOT be: it drives an actual browser
# (agent-browser) over the actual HTTP transport and asserts on real outcomes.
# It exists because Bug #1 (session cookie `Secure` over plain http://) passed
# every static check yet bounced every real user to /login.
#
# CRITICAL: run against a NON-localhost origin. localhost is a browser "secure
# context", so a `Secure` cookie is sent there even over http:// — meaning a
# localhost run would NOT reproduce the cookie-transport bug class. The default
# origin is the Tailscale address the app is actually served on.
#
# Usage:   bin/browser-audit.sh [ORIGIN]
#   ORIGIN  default http://100.110.64.90:3100  (override for LAN/HTTPS)
# Env:     DS_USER / DS_PASS / DS_ADMIN / DS_ADMIN_PASS  (seeded demo creds)
# Exit:    0 = all assertions passed, 1 = one or more failed (or server down).
# ---------------------------------------------------------------------------
set -u

ORIGIN="${1:-http://100.110.64.90:3100}"
AB="${DRIVER_BROWSER_CMD:-agent-browser}"
USER_EMAIL="${DS_USER:-user@drivers.school}"
USER_PASS="${DS_PASS:-User12345}"
ADMIN_EMAIL="${DS_ADMIN:-admin@drivers.school}"
ADMIN_PASS="${DS_ADMIN_PASS:-Admin12345}"

ts="$(date +%Y%m%d-%H%M%S)"
OUTDIR="${DS_AUDIT_OUT:-/tmp/ds-browser-audit}"
mkdir -p "$OUTDIR"
LOG="$OUTDIR/audit-$ts.log"

pass=0; fail=0
say() { printf '%s\n' "$*" | tee -a "$LOG"; }
ok()  { pass=$((pass+1)); say "  PASS  $*"; }
bad() { fail=$((fail+1)); say "  FAIL  $*"; }

url()  { "$AB" get url 2>/dev/null; }
body() { "$AB" get text "main" 2>/dev/null; }

# nav: navigate AND wait for the page to settle before any assertion/interaction.
nav() { "$AB" open "$1" >/dev/null 2>&1; "$AB" wait --load networkidle >/dev/null 2>&1; }

assert_url() {  # assert_url <substr> <label>
  local got; got="$(url)"
  case "$got" in
    *"$1"*) ok "$2 (url=$got)" ;;
    *)      bad "$2 — expected url to contain '$1', got '$got'" ;;
  esac
}
assert_text() {  # assert_text <substr> <label>
  if body | grep -qiF -- "$1"; then ok "$2"; else bad "$2 — page missing text '$1'"; fi
}

login() {  # login <email> <pass>
  nav "$ORIGIN/login"
  "$AB" wait --text "Вхід" >/dev/null 2>&1            # form is on screen before we type
  "$AB" find label "Електронна пошта" fill "$1" >/dev/null 2>&1
  "$AB" find label "Пароль" fill "$2" >/dev/null 2>&1
  "$AB" find role button click --name "Увійти" >/dev/null 2>&1
  "$AB" wait --load networkidle >/dev/null 2>&1
}
logout() {
  nav "$ORIGIN/dashboard"
  "$AB" find text "Вийти" click >/dev/null 2>&1
  "$AB" wait --load networkidle >/dev/null 2>&1
}
# start_exam: click the dashboard exam CTA and pass through the pre-exam calm ritual (Wave-14
# spec §C) if its overlay opens. The ritual is a CLIENT-ONLY overlay shown up to twice/day per
# device between the CTA and the real `startTestAction`, so a plain CTA click may not navigate —
# clicking «Почати одразу» submits the real EXAM_SIMULATION session. A no-op when the ritual is
# spent (the CTA then posts straight through). Keeps the exam-start regressions deterministic.
start_exam() {
  "$AB" find text "Почати симуляцію" click >/dev/null 2>&1
  sleep 1   # overlay opens client-side (pure state, no network)
  "$AB" eval '(function(){var b=[...document.querySelectorAll("button")].find(function(x){return x.textContent.trim()==="Почати одразу"});if(b)b.click()})()' >/dev/null 2>&1
  "$AB" wait --load networkidle >/dev/null 2>&1
}

# --- Wave-15 §F practice-mode helpers (wave15-15) ---------------------------
# click_btn: atomic locate+click by EXACT button text in ONE eval (wave12b-17). `find text` locates
# then clicks as two steps, so a re-render between them detaches the node and the click silently
# drops; exact match also distinguishes «Завершити» (confirm) from «Завершити тест» (open dialog).
click_btn() {  # click_btn <exact-button-text>
  "$AB" eval "(function(){var t='$1';var b=[...document.querySelectorAll('button')].find(function(x){return x.textContent.trim()===t});if(b)b.click()})()" >/dev/null 2>&1
}
# answer_radio: answer the current question via ONE atomic eval click of the first enabled option.
# Options are ARIA role="radio" BUTTONS (test-runner.tsx:537), not native <input type=radio>. The old
# `find role radio click` is a two-step locate-then-click that detaches during in-flight server-action
# re-renders and silently drops (~8/26 in the wave15 MARATHON loop → counter stuck at 18); the atomic
# eval closes the detach window, same proven pattern as click_btn (wave12b-17, wave15-16).
answer_radio() {
  "$AB" eval "(function(){var r=document.querySelector('main [role=radio]:not([disabled])');if(r)r.click()})()" >/dev/null 2>&1
}
# start_mode: from /practice, eval-click the hidden-mode discriminator's submit button (wave15-01
# finding (l): reuse the multi-«Почати» pattern, targeting the form by its input[name=mode][value=…]).
start_mode() {  # start_mode <MODE_VALUE>
  nav "$ORIGIN/practice"
  sleep 2   # let the submit buttons hydrate before clicking
  "$AB" eval "document.querySelector('input[name=mode][value=$1]').closest('form').querySelector('button').click()" >/dev/null 2>&1
  "$AB" wait --load networkidle >/dev/null 2>&1
}
# assert_main_text: assert a substring is present in main's textContent via eval — NOT `get text |
# grep -i` (innerText applies CSS text-transform and BSD grep does not case-fold Cyrillic; the
# Cyrillic-innerText trap). Substring must contain no single quote.
assert_main_text() {  # assert_main_text <substr> <label>
  local got; got="$("$AB" eval "document.querySelector('main')?.textContent.includes('$1')?'yes':'no'" 2>/dev/null)"
  case "$got" in
    *yes*) ok "$2" ;;
    *)     bad "$2 — main textContent missing '$1' (eval='$got')" ;;
  esac
}
# assert_main_text_absent: the inverse — assert a substring is NOT present in main's textContent
# (same eval path, same Cyrillic-innerText safety). Substring must contain no single quote.
assert_main_text_absent() {  # assert_main_text_absent <substr> <label>
  local got; got="$("$AB" eval "document.querySelector('main')?.textContent.includes('$1')?'yes':'no'" 2>/dev/null)"
  case "$got" in
    *yes*) bad "$2 — main textContent unexpectedly contains '$1'" ;;
    *)     ok "$2" ;;
  esac
}
# finish_session: leave no IN_PROGRESS session behind. QUICK/SIGN_TRAINER surface «Завершити тест»
# only on the LAST question (isLast); EXAM/MARATHON always show it. So advance to the last question
# with «Далі» first if the finish button is absent, then open the confirm dialog and confirm,
# retrying the open→confirm up to 3× until the URL reaches /result.
finish_session() {
  local has_finish
  has_finish="$("$AB" eval "[...document.querySelectorAll('button')].some(function(b){return b.textContent.trim()==='Завершити тест'})?'y':'n'" 2>/dev/null)"
  case "$has_finish" in
    *n*)
      local n=0
      while [ "$n" -lt 25 ]; do
        local has_next
        has_next="$("$AB" eval "[...document.querySelectorAll('button')].some(function(b){return b.textContent.trim()==='Далі'})?'y':'n'" 2>/dev/null)"
        case "$has_next" in *y*) click_btn "Далі"; sleep 1; n=$((n+1)) ;; *) break ;; esac
      done ;;
  esac
  local attempt=0
  while [ "$attempt" -lt 3 ]; do
    click_btn "Завершити тест"; sleep 1   # confirm dialog opens client-side (pure state, no network)
    click_btn "Завершити"
    "$AB" wait --load networkidle >/dev/null 2>&1; sleep 1
    case "$(url)" in *"/result"*) return 0 ;; esac
    attempt=$((attempt+1))
  done
  return 1
}

# --- Wave-17 value-first funnel helpers (wave17-14) -------------------------
# tap_chip: the /segment self-segment chips are <button type=submit> inside a TOP-LEVEL route with
# NO <main> (app/segment/page.tsx). Click the FIRST submit chip of the visible form in one atomic
# eval (same detach-safe pattern as click_btn) and wait for the server-action redirect to settle.
tap_chip() {
  "$AB" eval '(function(){var b=document.querySelector("form button[type=submit]");if(b)b.click()})()' >/dev/null 2>&1
  "$AB" wait --load networkidle >/dev/null 2>&1
}
# anon_fresh: drop every identity/guard so the next surface is a FIRST-VISIT ANON browser — no
# ds_session (real login) and no ds_anon_play (lazily-minted anon) — then land on /segment and clear
# the save-prompt dismissal guard so 18c can re-assert the prompt on a later run.
anon_fresh() {
  logout
  "$AB" cookies clear >/dev/null 2>&1
  nav "$ORIGIN/segment"
  "$AB" eval 'try{localStorage.removeItem("ds_save_prompt_dismissed")}catch(e){}' >/dev/null 2>&1
}

say "=== Drivers School browser audit — $ts ==="
say "origin: $ORIGIN"
case "$ORIGIN" in
  *localhost*|*127.0.0.1*) say "WARNING: localhost is a secure context — this run will NOT catch the Secure-cookie-over-http bug class." ;;
esac

# 0. server reachable?
if ! curl -sS -m 8 -o /dev/null "$ORIGIN/login"; then
  say "server not reachable at $ORIGIN — is it running? (npm run start on :3100)"
  exit 1
fi

# 1. REGRESSION (Bug #1): login must persist over the real transport → /dashboard
login "$USER_EMAIL" "$USER_PASS"
assert_url "/dashboard" "login persists (session cookie sent over real http)"
assert_text "не гарантує" "dashboard keeps readiness legal disclaimer (no official-pass guarantee)"

# 1b. Wave-12a §C: the glass TAB CAPSULE mounts with its 5 primary targets, and the ACTIVE tab
# (Головна on /dashboard) carries aria-current="page". A static token sweep can't prove the capsule
# actually renders or that active-state lands on the right tab — this is the nav-restyle runtime smoke.
nav_html="$("$AB" get html 'nav[aria-label="Основна навігація"]' 2>/dev/null)"
if printf '%s' "$nav_html" | grep -qF 'Головна' \
   && printf '%s' "$nav_html" | grep -qF 'Навчання' \
   && printf '%s' "$nav_html" | grep -qF 'Іспит' \
   && printf '%s' "$nav_html" | grep -qF 'Прогрес' \
   && printf '%s' "$nav_html" | grep -qF 'Профіль'; then
  ok "tab capsule renders its 5 primary targets (Головна · Навчання · Іспит · Прогрес · Профіль)"
else
  bad "tab capsule renders its 5 primary targets"
fi
if printf '%s' "$nav_html" | grep -q 'aria-current="page"'; then
  ok 'active dashboard tab carries aria-current="page"'
else
  bad 'active dashboard tab carries aria-current="page"'
fi

# 2. REGRESSION (reported bug): starting a test keeps the session → /test/<id>, not /login.
# Routed through start_exam so the Wave-14 calm ritual (if it intercepts) is passed through.
start_exam
assert_url "/test/" "start simulation keeps session (no bounce to /login)"
assert_text "Екзаменаційна симуляція" "test engine renders the exam"

# 2b. REGRESSION (Bug 2026-07-02): ANSWERING must work over the real transport. An unguarded
# crypto.randomUUID() (undefined in insecure contexts, i.e. plain http) threw on every option click —
# nothing selected, nothing submitted, every exam scored 0/20 — while ALL url-level assertions stayed
# green. This is the one assertion that actually ANSWERS a question: drive a PRACTICE session (immediate
# feedback mode) and assert the feedback badge renders, which requires the full click→submit→respond loop.
nav "$ORIGIN/practice"
"$AB" find text "Почати" click >/dev/null 2>&1
"$AB" wait --load networkidle >/dev/null 2>&1
assert_url "/test/" "start practice reaches the runner"
answer_radio
sleep 2   # answer submit round-trip
if body | grep -qiE 'Правильно|Неправильно'; then
  ok "answer click submits + immediate feedback renders (insecure-context regression)"
else
  bad "answer click submits + immediate feedback renders (insecure-context regression)"
fi

# 3. core authed pages render (no 500 / no redirect to /login)
for p in mistakes saved history account practice; do
  nav "$ORIGIN/$p"
  assert_url "/$p" "page /$p renders for authed user"
done

# 3a-c. Wave-15 §F LEARNER-STARTABLE MODES over the real transport: QUICK, MARATHON (incl. one
# refill), SIGN_TRAINER. Each starts from /practice via the hidden-mode discriminator, lands in the
# runner with its mode label, answers over the real transport, and FINISHES so repeated audit runs
# stay order-independent (no IN_PROGRESS leftover for getResumableSession to surface). User is still
# the seeded USER logged in at section 1.
say "--- Wave 15 §F practice modes ---"

# 3a. QUICK: short warm-up with IMMEDIATE reveal (a practice-family mode, not withheld). Start →
# runner «Швидка сесія»; one answer → Правильно|Неправильно; then finish.
start_mode QUICK
assert_url "/test/" "QUICK: start reaches the runner (no bounce)"
assert_main_text "Швидка сесія" "QUICK: runner chrome shows the «Швидка сесія» mode label"
answer_radio
sleep 2   # answer submit round-trip
if body | grep -qiE 'Правильно|Неправильно'; then
  ok "QUICK: answer click → immediate reveal (Правильно/Неправильно) over the real transport"
else
  bad "QUICK: answer click → immediate reveal (Правильно/Неправильно)"
fi
if finish_session; then
  ok "QUICK: session finished → /result (no IN_PROGRESS leftover)"
else
  bad "QUICK: could not finish the session (still on $(url))"
fi

# 3b. MARATHON: endless paged practice (page=MARATHON_PAGE=20). Answer past the ≤3-left refill
# threshold: the refill fires at 17 answered, so crossing 20 answered PROVES a new page was appended
# (a page-1-only session would hit «Все пройдено» at 20). Rolling counter is «N відповідано».
start_mode MARATHON
assert_url "/test/" "MARATHON: start reaches the runner (no bounce)"
assert_main_text "Марафон" "MARATHON: runner chrome shows the «Марафон» mode label"
answered=0
m=0
while [ "$m" -lt 30 ]; do
  answer_radio   # answer the current question
  sleep 1
  answered="$("$AB" eval '(document.querySelector("main")?.textContent.match(/(\d+)\s*відповідано/)||[])[1]||"0"' 2>/dev/null | tr -dc '0-9')"
  [ -z "$answered" ] && answered=0
  [ "$answered" -ge 21 ] && break
  click_btn "Далі"; sleep 1                      # advance to the next question
  m=$((m+1))
done
if [ "$answered" -ge 21 ]; then
  ok "MARATHON: rolling counter passed 20 ($answered відповідано) — the ≤3-left refill appended a new page"
else
  bad "MARATHON: counter did not cross 20 (got '$answered') — refill may not have fired"
fi
if finish_session; then
  ok "MARATHON: «Завершити тест» finishes → /result"
else
  bad "MARATHON: could not finish the session (still on $(url))"
fi

# 3c. SIGN_TRAINER: road-signs drill. Start → runner «Знаки»; options render; one answer → feedback;
# RELOAD the /test/<id> URL → still /test/ (session persists/resumes, not bounced to /login); finish.
start_mode SIGN_TRAINER
assert_url "/test/" "SIGN_TRAINER: start reaches the runner (no bounce)"
assert_main_text "Знаки" "SIGN_TRAINER: runner chrome shows the «Знаки» mode label"
st_radios="$("$AB" eval 'document.querySelectorAll("[role=radio]").length' 2>/dev/null | tr -dc '0-9')"
[ -z "$st_radios" ] && st_radios=0
if [ "$st_radios" -ge 2 ]; then
  ok "SIGN_TRAINER: answer options render ($st_radios radios)"
else
  bad "SIGN_TRAINER: answer options render (radios='$st_radios')"
fi
sign_url="$(url)"
answer_radio
sleep 2   # answer submit round-trip
if body | grep -qiE 'Правильно|Неправильно'; then
  ok "SIGN_TRAINER: answer click → immediate feedback over the real transport"
else
  bad "SIGN_TRAINER: answer click → immediate feedback"
fi
nav "$sign_url"
assert_url "/test/" "SIGN_TRAINER: reloading /test/<id> resumes the session (no /login bounce)"
if finish_session; then
  ok "SIGN_TRAINER: session finished → /result"
else
  bad "SIGN_TRAINER: could not finish the session (still on $(url))"
fi

# 4. auth guard: after logout, a protected page redirects to /login
logout
nav "$ORIGIN/dashboard"
assert_url "/login" "unauthenticated /dashboard → /login"

# 5. bad test id → graceful not-found (not a 500)
login "$USER_EMAIL" "$USER_PASS"
nav "$ORIGIN/test/doesnotexist123"
assert_text "НЕ ЗНАЙДЕНО" "bad test id → graceful not-found"

# 6. RBAC: plain user cannot reach /admin
nav "$ORIGIN/admin"
assert_url "/dashboard" "RBAC: plain user blocked from /admin"

# 7. admin can reach the admin panel
logout
login "$ADMIN_EMAIL" "$ADMIN_PASS"
nav "$ORIGIN/admin"
assert_url "/admin" "admin reaches /admin"
assert_text "ОГЛЯД" "admin overview renders"

# 8. admin-only readiness-shadow calibration view renders its unique heading
nav "$ORIGIN/admin/readiness-shadow"
shadow_body="$(body)"
if printf '%s' "$shadow_body" | grep -qiE 'Готовність|тінь'; then
  ok "admin readiness-shadow renders its heading («Готовність (тінь)»)"
else
  bad "admin readiness-shadow renders its heading («Готовність (тінь)»)"
fi

# 9. Wave-12b §H FRESH-USER lane: register a brand-new user (unique email per run), complete
# onboarding (keep the pre-checked category B, skip the optional exam-date/daily-goal steps), then
# assert the two ZERO-DATA calm states the seeded user can never show. Audit users accumulate in the
# dev DB by design (namespaced audit-*, no destructive cleanup here).
logout
FRESH_EMAIL="audit-$(date +%s)@drivers.school"
FRESH_PASS="Audit12345"
nav "$ORIGIN/register"
"$AB" wait --text "Реєстрація" >/dev/null 2>&1
"$AB" find label "Ім'я" fill "Аудит Браузер" >/dev/null 2>&1
"$AB" find label "Електронна пошта" fill "$FRESH_EMAIL" >/dev/null 2>&1
"$AB" find label "Пароль" fill "$FRESH_PASS" >/dev/null 2>&1
"$AB" find role button click --name "Зареєструватися" >/dev/null 2>&1
"$AB" wait --load networkidle >/dev/null 2>&1
assert_url "/onboarding" "fresh user registers → /onboarding ($FRESH_EMAIL)"

# onboarding: step 1 submits with category B pre-checked; steps 2/3/4 are optional (each «Пропустити»
# writes nothing). Wave-16 (spec T4, Goal 1c) inserted the prep-mode JTBD as step 3 — assert it
# renders and its «Пропустити» advances before continuing through the daily-goal step to the done
# screen (flow completes to /dashboard with nothing written). Onboarding lives OUTSIDE the (app)
# shell's <main>, so assert on document.body.textContent, not the `body`/`assert_text` helper.
"$AB" find role button click --name "Продовжити" >/dev/null 2>&1   # step 1 (category) → step 2
"$AB" wait --load networkidle >/dev/null 2>&1
"$AB" find text "Пропустити" click >/dev/null 2>&1                 # step 2 (exam date) → step 3
"$AB" wait --load networkidle >/dev/null 2>&1
prep_seen="$("$AB" eval 'document.body.textContent.includes("Як готуєшся?") ? "seen" : "absent"' 2>/dev/null)"
case "$prep_seen" in
  *seen*) ok "onboarding JTBD prep-mode step renders (spec T4 «Як готуєшся?»)" ;;
  *)      bad "onboarding JTBD prep-mode step missing — eval returned '$prep_seen'" ;;
esac
"$AB" find text "Пропустити" click >/dev/null 2>&1                 # step 3 (prep mode) → step 4
"$AB" wait --load networkidle >/dev/null 2>&1
"$AB" find text "Пропустити" click >/dev/null 2>&1                 # step 4 (daily goal) → done
"$AB" wait --load networkidle >/dev/null 2>&1
"$AB" find text "До навчання" click >/dev/null 2>&1                # done → dashboard
"$AB" wait --load networkidle >/dev/null 2>&1
assert_url "/dashboard" "fresh user completes onboarding (prep-mode step skipped, nothing written)"

# 9a. readiness dial shows the insufficient-data progress state — and NO percent/verdict. The
# percent only ever renders as an SVG <text> node inside [data-testid=readiness-dial], so its
# absence is the negative assertion (textContent-based, per the Cyrillic innerText trap).
assert_text "Ще недостатньо даних" "fresh dashboard dial shows insufficient-data copy"
dial_state="$("$AB" eval '(function(){var d=document.querySelector("[data-testid=readiness-dial]");if(!d)return "no-dial";return d.querySelector("svg text")?"has-percent":"no-percent"})()' 2>/dev/null)"
case "$dial_state" in
  *no-percent*) ok "fresh dial shows NO percent/verdict (insufficient data)" ;;
  *)            bad "fresh dial shows NO percent/verdict — eval returned '$dial_state'" ;;
esac

# 9b. SPACED nothing-due calm state: a zero-ReviewState user starting «Інтервальне повторення»
# lands back on /practice with the calm copy — a planned state, never an error. The spaced card is
# the SECOND «Почати» form, so target it by its hidden mode input rather than button text.
nav "$ORIGIN/practice"
sleep 2   # let the submit buttons hydrate before clicking
"$AB" eval 'document.querySelector("input[name=mode][value=SPACED_REVIEW]").closest("form").querySelector("button").click()' >/dev/null 2>&1
"$AB" wait --load networkidle >/dev/null 2>&1
assert_url "/practice?empty=SPACED_REVIEW" "fresh user SPACED review → calm redirect back to /practice"
assert_text "пам'ять ще тримає" "nothing-due calm copy renders (not an error state)"

# 10. Wave-12b §H PLAN-CARD lane (seeded user): the dashboard «Сьогоднішній план» card must start
# a real ADAPTIVE_REVIEW session through startTestAction — proven by landing on /test/<id> with the
# runner header showing the mode label «Розумне повторення», not by static markup.
logout
login "$USER_EMAIL" "$USER_PASS"
nav "$ORIGIN/dashboard"
sleep 2   # let the plan card's submit button hydrate before clicking
# wave21-07: the plan card renders the clamped `plan.dailyQuota` (never an unbounded one-shot
# quota) and its copy must NOT threaten multi-day failure — the «Не встигнете за» line was
# retired with the honest-plan model (wave21-03). Assert it never renders on the plan card.
assert_main_text "Сьогоднішній план" "plan card «Сьогоднішній план» renders (seeded user, intelligence unlocked)"
assert_main_text_absent "Не встигнете за" "plan card drops the removed multi-day threat copy («Не встигнете за»)"
"$AB" find text "Почати план" click >/dev/null 2>&1
"$AB" wait --load networkidle >/dev/null 2>&1
assert_url "/test/" "plan card «Сьогоднішній план» starts a session"
assert_text "Розумне повторення" "plan-card session runs ADAPTIVE_REVIEW (runner header «Розумне повторення»)"

# 11. Wave-12b §H RESULT lane (seeded user): FINISH an exam over the real transport (the
# design-shots answer→«Завершити»→confirm flow) and assert the result page's corrective topic
# summary. Every question gets its FIRST option, so an all-correct run is implausible — but if it
# ever happens the summary is legitimately absent and the pass headline must show instead
# (guarded either/or; the log line says which fired).
nav "$ORIGIN/dashboard"
start_exam
assert_url "/test/" "result lane: exam simulation starts"
q=0
while [ "$q" -lt 20 ]; do
  answer_radio    # first option of the current question
  sleep 1                                        # answer submit round-trip
  "$AB" find text "Далі" click >/dev/null 2>&1   # advance; harmless no-op on the last question
  q=$((q+1))
done
sleep 2   # let the final answer land before finishing
# Finish via eval clicks — atomic locate+click in ONE JS call. `find text` locates then clicks,
# and the runner re-renders as the 20 answer responses land, so the located node can detach
# before the click (observed flake). Exact-text match matters too: the confirm dialog's button
# is «Завершити», the nav bar's is «Завершити тест» — a substring find hits the overlay-covered
# nav button and refuses the click. Retry the whole open-dialog→confirm sequence up to 3×.
attempt=0
while [ "$attempt" -lt 3 ]; do
  "$AB" eval '(function(){var b=[...document.querySelectorAll("button")].find(function(x){return x.textContent.trim()==="Завершити тест"});if(b)b.click()})()' >/dev/null 2>&1
  sleep 1   # confirm dialog opens client-side (pure state, no network)
  "$AB" eval '(function(){var b=[...document.querySelectorAll("button")].find(function(x){return x.textContent.trim()==="Завершити"});if(b)b.click()})()' >/dev/null 2>&1
  "$AB" wait --load networkidle >/dev/null 2>&1
  sleep 1
  case "$(url)" in *"/result"*) break ;; esac
  attempt=$((attempt+1))
done
assert_url "/result" "exam finish reaches /test/<id>/result"
result_body="$(body)"
if printf '%s' "$result_body" | grep -qF 'Найбільше помилок у темах'; then
  ok 'result page shows the corrective topic summary («Найбільше помилок у темах»)'
elif printf '%s' "$result_body" | grep -qF 'Складено. Тримайте форму.'; then
  ok 'result page shows the pass headline («Складено. Тримайте форму.») — all-correct run, topic summary legitimately absent'
else
  bad 'result page shows neither «Найбільше помилок у темах» nor «Складено. Тримайте форму.»'
fi

# 16. Wave-14 §G: the day's quiet nudge, confidence calibration, data rights, the pre-exam calm
# ritual, and the admin learning-health page — the Wave 14 features over the real transport. The
# seeding helper (scripts/audit-seed-nudge.ts) makes the dashboard nudge DETERMINISTIC across
# REPEATED audit runs: it upserts one DUE ReviewState for the seeded user and clears their recent
# NotificationLog rows, so REVIEW_DUE fires and a card dismissed on the previous run can't suppress
# today's (which would otherwise flake 16b).
say "--- Wave 14 §G ---"
if npx tsx scripts/audit-seed-nudge.ts >>"$LOG" 2>&1; then
  ok "audit-seed-nudge helper ran (due review seeded, daily/weekly suppressors reset)"
else
  bad "audit-seed-nudge helper failed to run (see $LOG)"
fi
logout
login "$USER_EMAIL" "$USER_PASS"

# 16a/b. The dashboard nudge card renders its calm REVIEW_DUE copy; «Зрозуміло» dismisses it over
# the real transport (dismissAction is a real server-action form) and it is GONE after a fresh nav.
nav "$ORIGIN/dashboard"
assert_text "картки на повторення" "Wave-14 nudge card renders on dashboard (REVIEW_DUE copy)"
"$AB" eval '(function(){var b=[...document.querySelectorAll("button")].find(function(x){return x.textContent.trim()==="Зрозуміло"});if(b)b.click()})()' >/dev/null 2>&1
"$AB" wait --load networkidle >/dev/null 2>&1
nav "$ORIGIN/dashboard"
nudge_gone="$("$AB" eval 'document.querySelector("main")?.textContent.includes("картки на повторення") ? "present" : "absent"' 2>/dev/null)"
case "$nudge_gone" in
  *absent*) ok "«Зрозуміло» dismisses the nudge over the real transport (absent after reload)" ;;
  *)        bad "nudge still present after dismiss — eval returned '$nudge_gone'" ;;
esac

# 16c. /progress confidence calibration (spec §B): the section title always renders; the audit
# never records a confidence rating on any answer, so the seeded user stays in the insufficient
# state and the invite copy shows too (deterministic — asserted, not just the title).
nav "$ORIGIN/progress"
assert_text "Калібрування впевненості" "Wave-14 calibration section renders on /progress"
assert_text "Відповідайте на питання про впевненість" "calibration shows the insufficient-data invite (no confidence answers)"

# 16d. /account/data data-rights (spec §E): both the export and the delete affordances render.
nav "$ORIGIN/account/data"
assert_text "Завантажити мої дані" "Wave-14 /account/data offers data export"
assert_text "Видалити акаунт назавжди" "Wave-14 /account/data offers account deletion"

# 16e. Pre-exam calm ritual (spec §C): clear the twice-a-day localStorage guard so the overlay is
# guaranteed to open, click the exam CTA, assert «Хвилина спокою», then «Почати одразу» submits the
# REAL EXAM_SIMULATION session → /test/.
nav "$ORIGIN/dashboard"
"$AB" eval 'localStorage.removeItem("ds_calm_ritual_day")' >/dev/null 2>&1
"$AB" find text "Почати симуляцію" click >/dev/null 2>&1
sleep 1   # overlay opens client-side (pure state, no network)
calm_seen="$("$AB" eval 'document.body.textContent.includes("Хвилина спокою") ? "seen" : "absent"' 2>/dev/null)"
case "$calm_seen" in
  *seen*) ok "exam CTA opens the calm ritual overlay («Хвилина спокою»)" ;;
  *)      bad "exam CTA did not open the calm ritual — eval returned '$calm_seen'" ;;
esac
"$AB" eval '(function(){var b=[...document.querySelectorAll("button")].find(function(x){return x.textContent.trim()==="Почати одразу"});if(b)b.click()})()' >/dev/null 2>&1
"$AB" wait --load networkidle >/dev/null 2>&1
assert_url "/test/" "calm ritual «Почати одразу» starts a real exam session"
assert_text "Екзаменаційна симуляція" "calm-ritual exam session renders the runner"

# 16f. Admin learning-health page (spec §D): the admin sees «Здоровʼя навчання»; the plain user is
# bounced to /dashboard (RBAC). Heading asserted via eval textContent — the h1 is `uppercase`, and
# `get text` innerText would apply the transform (BSD grep does not case-fold Cyrillic).
logout
login "$ADMIN_EMAIL" "$ADMIN_PASS"
nav "$ORIGIN/admin/learning-health"
lh_seen="$("$AB" eval 'document.querySelector("main")?.textContent.includes("Здоров") ? "seen" : "absent"' 2>/dev/null)"
case "$lh_seen" in
  *seen*) ok "admin reaches /admin/learning-health (heading «Здоровʼя навчання» renders)" ;;
  *)      bad "admin /admin/learning-health heading missing — eval returned '$lh_seen'" ;;
esac
logout
login "$USER_EMAIL" "$USER_PASS"
nav "$ORIGIN/admin/learning-health"
assert_url "/dashboard" "RBAC: plain user blocked from /admin/learning-health"

# 12. Wave-13 §F: PWA manifest serves over the real transport as valid JSON with the
# installability essentials (standalone display, /dashboard start_url).
manifest_file="$OUTDIR/manifest-$ts.json"
manifest_args=(-sS -m 8 -o "$manifest_file" -w '%{http_code}')
mcode="$(curl "${manifest_args[@]}" "$ORIGIN/manifest.webmanifest" || true)"
if [ "$mcode" = "200" ] && node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$manifest_file" >/dev/null 2>&1; then
  ok "manifest.webmanifest → 200 + parses as JSON"
else
  bad "manifest.webmanifest → 200 + parses as JSON (http $mcode)"
fi
if grep -qF '"standalone"' "$manifest_file"; then
  ok 'manifest declares display "standalone"'
else
  bad 'manifest declares display "standalone"'
fi
if grep -qF '"/dashboard"' "$manifest_file"; then
  ok 'manifest start_url is "/dashboard"'
else
  bad 'manifest start_url is "/dashboard"'
fi

# 13. Wave-13 §F: q-image content negotiation over the real transport, against the known
# restyled key 11_10_0. This is the wave's ONLY real-encoder transport check (the
# integration test uses dummy bytes): an Accept: image/avif client with a whitelisted
# ?w= gets the prebaked AVIF variant (immutable, under the 120KB budget); a plain
# Accept: */* client gets the original PNG (cacheable but NOT immutable — overrides can
# change a key's image).
QIMG_URL="$ORIGIN/api/q-image/11_10_0?w=540"
qi_hdr="$OUTDIR/qimg-avif-$ts.hdr"; qi_body="$OUTDIR/qimg-avif-$ts.bin"
avif_args=(-sS -m 8 -H "Accept: image/avif" -D "$qi_hdr" -o "$qi_body" -w '%{http_code}')
qcode="$(curl "${avif_args[@]}" "$QIMG_URL" || true)"
if [ "$qcode" = "200" ] && grep -iE '^content-type:.*image/avif' "$qi_hdr" >/dev/null 2>&1; then
  ok "q-image Accept:image/avif + ?w=540 → content-type image/avif"
else
  bad "q-image Accept:image/avif + ?w=540 → content-type image/avif (http $qcode) — if the variant is absent on this box, run 'npm run prebake:images'"
fi
qsize="$(wc -c < "$qi_body" | tr -d ' ')"
if [ "$qsize" -gt 0 ] && [ "$qsize" -le 122880 ]; then
  ok "q-image AVIF body within budget ($qsize bytes ≤ 122880)"
else
  bad "q-image AVIF body within budget — got $qsize bytes (want 1..122880)"
fi
if grep -iE '^cache-control:.*immutable' "$qi_hdr" >/dev/null 2>&1; then
  ok "q-image AVIF variant is cache-control immutable"
else
  bad "q-image AVIF variant is cache-control immutable"
fi
qp_hdr="$OUTDIR/qimg-png-$ts.hdr"
png_args=(-sS -m 8 -H "Accept: */*" -D "$qp_hdr" -o /dev/null -w '%{http_code}')
pcode="$(curl "${png_args[@]}" "$QIMG_URL" || true)"
if [ "$pcode" = "200" ] && grep -iE '^content-type:.*image/png' "$qp_hdr" >/dev/null 2>&1; then
  ok "q-image Accept:*/* (same URL) → falls through to original image/png"
else
  bad "q-image Accept:*/* (same URL) → falls through to original image/png (http $pcode)"
fi
if grep -iE '^cache-control:.*immutable' "$qp_hdr" >/dev/null 2>&1; then
  bad "q-image original must NOT be immutable (overrides can change it)"
else
  ok "q-image original is NOT cache-control immutable"
fi

# 14. Wave-13 §F: service worker — BEST-EFFORT by design. Over the http LAN IP the page
# is NOT a secure context, so navigator.serviceWorker legitimately does not exist; that
# is a documented SKIP (informational, not FAIL). The REAL registration + offline
# assertions run over http://localhost:3100 (a secure context) in the wave13-19
# Playwright E2E — the two origins test disjoint failure classes.
sw_avail="$("$AB" eval '"serviceWorker" in navigator' 2>/dev/null)"
case "$sw_avail" in
  *true*)
    sw_reg="$("$AB" eval 'navigator.serviceWorker.getRegistration().then(function(r){return r ? "registered" : "unregistered"})' 2>/dev/null)"
    case "$sw_reg" in
      *registered*) ok "service worker registered (secure-context origin)" ;;
      *)            bad "serviceWorker API exists but no registration — got '$sw_reg'" ;;
    esac
    ;;
  *)
    say "  SKIP  serviceWorker API unavailable (insecure http LAN origin — expected; real SW asserts live in the localhost Playwright E2E)"
    ;;
esac

# 15. Wave-13 §F: the /~offline SW-fallback page is PUBLIC — an unauthenticated navigation
# must stay on /~offline (no /login bounce) and render the offline copy. Asserted via
# eval textContent, not `get text` (innerText applies CSS text-transform and BSD grep
# does not case-fold Cyrillic).
logout
nav "$ORIGIN/~offline"
assert_url "/~offline" "unauthenticated /~offline stays put (no /login bounce)"
offline_text="$("$AB" eval 'document.body.textContent.includes("Ви офлайн")' 2>/dev/null)"
case "$offline_text" in
  *true*) ok "offline fallback page renders «Ви офлайн»" ;;
  *)      bad "offline fallback page renders «Ви офлайн» — eval returned '$offline_text'" ;;
esac

# 17. Wave-16 (spec T1–T6): interest-capture pricing, the public question page, the exam-outcome
# form, and FLAG-OFF inertness. The entitlements master flag ships OFF (ENTITLEMENTS_ENABLED unset),
# so the intelligence gate is INERT — everyone is "unlocked" and the locked-state teaser mounts on
# NONE of the gated surfaces; teaser ABSENCE is itself an assertion (Goal 1e). Flag-ON behaviour is
# locked by the wave16 integration suites and is deliberately NOT flipped on this long-lived server.
say "--- Wave 16 (entitlements flag OFF — inert) ---"

# 17a. /pricing (spec T2): a logged-in user sees the ONE-plan card (price 399, «Доступ до іспиту»).
# The interest CTA is a client button that records interest via /api/track then swaps to a calm
# confirmation — no checkout. Assert the swap via an atomic exact-text eval click.
logout
login "$USER_EMAIL" "$USER_PASS"
nav "$ORIGIN/pricing"
assert_url "/pricing" "/pricing renders for a logged-in user"
assert_main_text "399" "/pricing shows the single price (399 ₴)"
assert_main_text "Доступ до іспиту" "/pricing shows the plan title «Доступ до іспиту»"
click_btn "Хочу доступ до іспиту"
sleep 1   # client state swap + fire-and-forget /api/track beacon (no navigation)
assert_main_text "Дякуємо" "/pricing interest CTA swaps to the confirmation state"

# 17b. /q/<key> (spec T5): the PUBLIC question page. Pick a live published key at runtime (a reseed
# could drop a hardcoded one). It must be reachable LOGGED-OUT — clear cookies so a leftover session
# can't mask an accidental auth dependency. Correctness («Правильна відповідь») is WITHHELD until an
# option is picked (?v=), the page emits meta robots noindex (Gate 0 closed), and an unknown key 404s.
# /q lives OUTSIDE the (app) shell → no <main>, so assert on document.body.textContent.
QKEY="$(sqlite3 prisma/dev.db "SELECT questionKey FROM Question WHERE isPublished=1 AND isActive=1 AND archivedAt IS NULL AND questionKey IS NOT NULL ORDER BY questionKey LIMIT 1;" 2>/dev/null)"
[ -z "$QKEY" ] && QKEY="q_10_1"
logout
"$AB" cookies clear >/dev/null 2>&1
qcode2="$(curl -sS -m 8 -o /dev/null -w '%{http_code}' "$ORIGIN/q/$QKEY" || true)"
if [ "$qcode2" = "200" ]; then
  ok "/q/$QKEY reachable logged-out (HTTP 200)"
else
  bad "/q/$QKEY reachable logged-out — got HTTP $qcode2"
fi
nav "$ORIGIN/q/$QKEY"
q_pre="$("$AB" eval 'document.body.textContent.includes("Правильна відповідь") ? "present" : "absent"' 2>/dev/null)"
case "$q_pre" in
  *absent*) ok "/q initial (logged-out) view WITHHOLDS «Правильна відповідь» (no-leak before a pick)" ;;
  *)        bad "/q initial view already reveals «Правильна відповідь» — eval '$q_pre'" ;;
esac
q_robots="$("$AB" eval 'document.querySelector("meta[name=robots]")?.content || ""' 2>/dev/null)"
case "$q_robots" in
  *noindex*) ok "/q emits meta robots noindex (Gate 0 closed)" ;;
  *)         bad "/q meta robots missing noindex — got '$q_robots'" ;;
esac
# Reveal by opening ?v=1 (Goal 1b: an option link, or ?v=1). Every published question has ≥2
# options with displayOrders 0,1,… so ?v=1 names a real option → the correct answer is revealed.
nav "$ORIGIN/q/$QKEY?v=1"
q_post="$("$AB" eval 'document.body.textContent.includes("Правильна відповідь") ? "present" : "absent"' 2>/dev/null)"
case "$q_post" in
  *present*) ok "/q reveals «Правильна відповідь» after picking an option (?v=1)" ;;
  *)         bad "/q did not reveal «Правильна відповідь» after ?v=1 — eval '$q_post'" ;;
esac
nfcode="$(curl -sS -m 8 -o /dev/null -w '%{http_code}' "$ORIGIN/q/q_nope_404" || true)"
if [ "$nfcode" = "404" ]; then
  ok "/q unknown key (q_nope_404) → HTTP 404 not-found"
else
  bad "/q unknown key (q_nope_404) → not-found — got HTTP $nfcode"
fi

# 17c. account (spec T3): the self-reported exam-outcome form renders both «Склав» and «Не склав»
# radio labels. Capital-С «Склав» vs the lowercase «склав» inside «Не склав» keeps the includes()
# checks distinct.
logout
login "$USER_EMAIL" "$USER_PASS"
nav "$ORIGIN/account"
assert_main_text "Склав" "account: exam-outcome form offers «Склав»"
assert_main_text "Не склав" "account: exam-outcome form offers «Не склав»"

# 17d. FLAG-OFF INERTNESS (spec T6, Goal 1e): with the flag OFF the gate is inert, so the locked
# teaser (components/entitlement-teaser.tsx — its binding CTA is «Відкрити доступ» → /pricing) mounts
# on NONE of the gated surfaces. Assert ABSENCE of both the CTA copy and any /pricing link on
# dashboard, /progress and /mistakes — the wave shipped visually inert. (Still logged in as USER.)
assert_no_teaser() {  # assert_no_teaser <path>
  nav "$ORIGIN$1"
  local hasteaser haslink
  hasteaser="$("$AB" eval 'document.querySelector("main")?.textContent.includes("Відкрити доступ") ? "yes" : "no"' 2>/dev/null)"
  haslink="$("$AB" eval 'document.querySelector("main a[href=\"/pricing\"]") ? "yes" : "no"' 2>/dev/null)"
  case "$hasteaser$haslink" in
    *yes*) bad "flag-OFF inertness: $1 shows a teaser/pricing link (teaser='$hasteaser' link='$haslink')" ;;
    *)     ok "flag-OFF inertness: $1 shows NO teaser copy and NO /pricing link" ;;
  esac
}
assert_no_teaser "/dashboard"
assert_no_teaser "/progress"
assert_no_teaser "/mistakes"

# 18. Wave-17 VALUE-FIRST FUNNEL — the ANON value-first flow over the REAL transport. This is the
# class of bug the static checks structurally cannot catch (REAL-TRANSPORT GATE, root CLAUDE.md): the
# whole funnel is a client↔server dance minted lazily by cookies, so it must be driven in a real
# browser over the actual http origin. It keys off the SERVER's own flag as read from THIS audit's
# env (VALUE_FIRST_FUNNEL): flag ON runs 18a–18e; flag OFF runs only the disjoint bounce regression.
#
# PRECONDITIONS (else the live assertions are meaningless — see verify.sh, which skips when unmet):
#   • The LAN `next start` server must be RESTARTED on the CURRENT build before this audit — `next
#     start` loads .next once at boot and does NOT hot-reload a later `next build`, so the funnel
#     routes/components 404 or render stale otherwise (STALE-SERVER trap, root CLAUDE.md).
#   • VALUE_FIRST_FUNNEL=true must be set in the SERVER's env (so the funnel is live) AND exported to
#     this audit (so the branch below runs the ON path against it). The two must agree.
say "--- Wave 17 value-first funnel ---"

if [ "${VALUE_FIRST_FUNNEL:-}" != "true" ]; then
  # 18-off. FLAG-OFF regression (Goal §2): with the funnel OFF, a fresh anon visitor hitting the
  # funnel entry (/segment) still bounces to /login — today's auth gate intact. Disjoint from the ON
  # assertions so a regression in EITHER direction is caught. Exercised by pointing this audit at a
  # server whose env does NOT set VALUE_FIRST_FUNNEL=true (the audit mirrors the server's flag state).
  logout
  "$AB" cookies clear >/dev/null 2>&1
  nav "$ORIGIN/segment"
  assert_url "/login" "flag-OFF regression: anon /segment bounces to /login (today's gate intact)"
  say "  SKIP  funnel ON assertions (18a–18e) — server flag is OFF; set VALUE_FIRST_FUNNEL=true on the server AND in this audit's env to run them"
else
  # ---- funnel ON: the full anon value-first journey ----

  # 18a ANON PLAY + 18b SEGMENT. A fresh anon browser self-segments with TAPS ONLY (no email/password
  # field on any step — proves wave17-07's ≤4-tap budget) and the final tap opens a real /test/<id>
  # loop instead of bouncing to /login (proves wave17-04's requirePlayableUser anon play).
  anon_fresh
  assert_url "/segment" "SEGMENT: fresh anon reaches /segment without login (flag on)"
  seg_field="$("$AB" eval 'document.querySelector("input[type=password], input[type=email]") ? "has" : "none"' 2>/dev/null)"
  case "$seg_field" in
    *none*) ok "SEGMENT: category step is taps-only (no email/password field present)" ;;
    *)      bad "SEGMENT: an email/password field is present on the segment step (eval='$seg_field')" ;;
  esac
  tap_chip   # step 1: category  → /segment?step=timing
  tap_chip   # step 2: timing    → /segment?step=confidence
  tap_chip   # step 3: confidence→ opens the real question loop
  assert_url "/test/" "ANON PLAY: anon self-segment opens a real /test/<id> loop (no /login bounce)"
  assert_main_text "Змішана практика" "ANON PLAY: runner renders the MIXED_PRACTICE session"
  PLAY_URL="$(url)"
  answer_radio
  sleep 2   # answer submit round-trip
  if body | grep -qiE 'Правильно|Неправильно'; then
    ok "ANON PLAY: answering advances over the real transport (immediate feedback renders)"
  else
    bad "ANON PLAY: answering did not produce feedback (progress did not advance)"
  fi

  # 18c SAVE PROMPT (proves wave17-06): after ≥ ANON_SAVE_PROMPT_THRESHOLD(5) answers, «Зберегти
  # прогрес» appears in main; «Не зараз» dismisses it and it does not immediately reappear. progressCount
  # is computed SERVER-side at page render (test/[id]/page.tsx), so RELOAD the session URL after
  # answering to guarantee the updated count reaches the (client) SaveProgressPrompt mount effect.
  click_btn "Далі"; sleep 1
  a=1
  while [ "$a" -lt 6 ]; do answer_radio; sleep 1; click_btn "Далі"; sleep 1; a=$((a+1)); done  # ≥6 answered
  nav "$PLAY_URL"   # re-render with the updated server-side progressCount
  assert_main_text "Зберегти прогрес" "SAVE PROMPT: «Зберегти прогрес» appears after ≥5 anon answers"
  click_btn "Не зараз"; sleep 1
  save_after="$("$AB" eval 'document.querySelector("main")?.textContent.includes("Зберегти прогрес") ? "present" : "absent"' 2>/dev/null)"
  case "$save_after" in
    *absent*) ok "SAVE PROMPT: «Не зараз» dismisses the prompt (absent, no immediate re-nag)" ;;
    *)        bad "SAVE PROMPT: prompt still present after «Не зараз» (eval='$save_after')" ;;
  esac

  # 18d VALUE ASK (proves wave17-08): the honest 399 ₴ offer is a DIAGNOSTIC-ONLY, AUTHED, data-
  # SUFFICIENT surface — NOT reachable by the anon MIXED_PRACTICE loop above. It mounts on the result
  # page ONLY when session.mode==DIAGNOSTIC AND getLatestReadiness reports sufficientData (≥
  # READINESS_MIN_SEEN=20 seen questions) AND the funnel flag is on (app/(app)/test/[id]/result/page.tsx
  # :42 `dial = isDiagnostic ? getLatestReadiness(...) : null`, :48 `dialReal = dial?.sufficientData`,
  # :50 `showOffer = dialReal && flag`). The anon path can NEVER show it: wave18-01 lets an anon view
  # their OWN completed /result payoff (score/stats/«Розбір питань»), but the dial/offer stay gated —
  # an anon MIXED_PRACTICE/EXAM finish has dial=null (the dial needs an AUTHED, data-sufficient
  # DIAGNOSTIC) → showOffer=false, so the anon never reaches the offer card. So retarget it at the
  # SEEDED authed user, who accumulates ≥20 seen ReviewState rows across the audit's earlier exam/
  # practice sections; /result recomputes the dial LIVE on every render, so ANY completed diagnostic's
  # /result surfaces the offer once the user is data-sufficient today. Keep this authed sequence SHORT
  # (agent-browser drops the httpOnly ds_session over many navs). When the user isn't yet data-
  # sufficient (honesty law: a first 15-Q diagnostic < 20 seen renders NOTHING), the offer is correctly
  # withheld — log a SKIP rather than false-fail. «було» is deliberately NOT in the DO-NOT absence set
  # («була/було» is a common word → false positives); the strong scarcity/discount tokens suffice.
  login "$USER_EMAIL" "$USER_PASS"
  nav "$ORIGIN/dashboard"
  # Start a fresh diagnostic if the invite card is still present (retired once any diagnostic completes).
  "$AB" eval '(function(){var i=document.querySelector("input[name=mode][value=DIAGNOSTIC]");if(i)i.closest("form").querySelector("button").click()})()' >/dev/null 2>&1
  "$AB" wait --load networkidle >/dev/null 2>&1
  RESULT_URL=""
  case "$(url)" in
    *"/test/"*) if finish_session; then RESULT_URL="$(url)"; fi ;;
  esac
  if [ -z "$RESULT_URL" ]; then
    # Card retired (a diagnostic already exists) — open the most recent DIAGNOSTIC result from /history
    # (each row links to /test/<id>/result labelled MODE_LABEL.DIAGNOSTIC = «Стартова перевірка»).
    nav "$ORIGIN/history"
    "$AB" eval '(function(){var a=[...document.querySelectorAll("a[href*=result]")].find(function(x){return x.textContent.indexOf("Стартова перевірка")>=0});if(a)a.click()})()' >/dev/null 2>&1
    "$AB" wait --load networkidle >/dev/null 2>&1
    case "$(url)" in *"/result"*) RESULT_URL="$(url)" ;; esac
  fi
  if [ -z "$RESULT_URL" ]; then
    say "  SKIP  VALUE ASK: no DIAGNOSTIC result reachable for the seeded user (none completed yet) — offer surface not exercised this run"
  else
    assert_url "/result" "VALUE ASK: authed seeded user reaches a DIAGNOSTIC result surface"
    offer_present="$("$AB" eval 'document.querySelector("main")?.textContent.includes("Ти на")?"yes":"no"' 2>/dev/null)"
    case "$offer_present" in
      *yes*)
        ok "VALUE ASK: offer card anchors to the real readiness % («Ти на N%»)"
        assert_main_text "399" "VALUE ASK: offer shows the one-time price (399 ₴)"
        assert_main_text "не підписка" "VALUE ASK: offer states «не підписка» (one-time, no subscription)"
        donot="$("$AB" eval '(function(){var t=document.querySelector("main")?.textContent||"";return ["Купити","знижка","SALE","ціна діє","купують","залишилось"].filter(function(w){return t.indexOf(w)>=0}).join("|")})()' 2>/dev/null)"
        # agent-browser eval JSON-serializes results, so a CLEAN surface returns the 2-char string `""`,
        # not an empty string — strip surrounding quotes (tokens never contain ") before the empty check.
        donot="${donot//\"/}"
        case "$donot" in
          "") ok "VALUE ASK: forbidden DO-NOT scarcity/discount tokens ABSENT from the offer surface" ;;
          *)  bad "VALUE ASK: forbidden DO-NOT token(s) present on the offer surface: $donot" ;;
        esac ;;
      *)
        say "  SKIP  VALUE ASK: seeded user not yet data-sufficient (< READINESS_MIN_SEEN seen) — honesty law withholds the offer; re-run after more answers to exercise it" ;;
    esac
  fi

  # 18e MIGRATION (proves wave17-05 over the real transport): registering FROM the save prompt carries
  # the pre-register anon progress into the new account (convert-in-place). Start a SECOND fresh anon
  # session, answer past the save-prompt threshold, click «Зберегти прогрес» → /register, register +
  # onboard, then prove the new account OWNS the pre-register session: navigating back to its
  # /test/<id> URL loads the runner (not /login, not not-found), and finishing it lands a COMPLETED
  # row in /history (the pre-register answers carried).
  anon_fresh
  tap_chip; tap_chip; tap_chip   # category → timing → confidence → /test/<id>
  MIG_URL="$(url)"
  case "$MIG_URL" in
    *"/test/"*) ok "MIGRATION: fresh anon reaches a play loop before register ($MIG_URL)" ;;
    *)          bad "MIGRATION: fresh anon did not reach /test/ (got '$MIG_URL')" ;;
  esac
  a=0
  while [ "$a" -lt 6 ]; do answer_radio; sleep 1; click_btn "Далі"; sleep 1; a=$((a+1)); done
  nav "$MIG_URL"   # re-render so the save prompt (progressCount ≥ 5) is present to click
  # Click the save CTA (LinkButton → /register). EXACT-text «Зберегти прогрес» distinguishes the CTA
  # from the card heading «Зберегти прогрес і готовність».
  "$AB" eval '(function(){var a=[...document.querySelectorAll("a")].find(function(x){return x.textContent.trim()==="Зберегти прогрес"});if(a)a.click()})()' >/dev/null 2>&1
  "$AB" wait --load networkidle >/dev/null 2>&1
  assert_url "/register" "MIGRATION: «Зберегти прогрес» routes the anon visitor to /register"
  MIG_EMAIL="anon-$(date +%s)@drivers.school"
  "$AB" find label "Ім'я" fill "Анон Мігрант" >/dev/null 2>&1
  "$AB" find label "Електронна пошта" fill "$MIG_EMAIL" >/dev/null 2>&1
  "$AB" find label "Пароль" fill "Anon12345" >/dev/null 2>&1
  "$AB" find role button click --name "Зареєструватися" >/dev/null 2>&1
  "$AB" wait --load networkidle >/dev/null 2>&1
  assert_url "/onboarding" "MIGRATION: anon registers → /onboarding ($MIG_EMAIL)"
  # skip through onboarding to /dashboard (same step shape as section 9: 1 «Продовжити» + 3 skips + done)
  "$AB" find role button click --name "Продовжити" >/dev/null 2>&1; "$AB" wait --load networkidle >/dev/null 2>&1
  "$AB" find text "Пропустити" click >/dev/null 2>&1; "$AB" wait --load networkidle >/dev/null 2>&1
  "$AB" find text "Пропустити" click >/dev/null 2>&1; "$AB" wait --load networkidle >/dev/null 2>&1
  "$AB" find text "Пропустити" click >/dev/null 2>&1; "$AB" wait --load networkidle >/dev/null 2>&1
  "$AB" find text "До навчання" click >/dev/null 2>&1; "$AB" wait --load networkidle >/dev/null 2>&1
  # ownership oracle: the just-created account now OWNS the pre-register session (convert-in-place).
  nav "$MIG_URL"
  assert_url "/test/" "MIGRATION: new account owns the pre-register anon session (loads, no /login or not-found)"
  if finish_session; then
    nav "$ORIGIN/history"
    hist_state="$("$AB" eval 'document.querySelector("main")?.textContent.includes("ще не завершили жодного") ? "empty" : "has"' 2>/dev/null)"
    case "$hist_state" in
      *has*) ok "MIGRATION: pre-register answers carried — /history shows the migrated completed session" ;;
      *)     bad "MIGRATION: /history still empty for the migrated account (answers did not carry)" ;;
    esac
  else
    bad "MIGRATION: could not finish the migrated session (still on $(url))"
  fi
fi

"$AB" close --all >/dev/null 2>&1

say ""
say "=== browser audit: $pass passed, $fail failed === (log: $LOG)"
[ "$fail" -eq 0 ]
