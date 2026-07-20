#!/usr/bin/env bash
#
# funnel-donot-guard.sh — executable HARD-DO-NOT compliance gate over the wave-17 funnel surfaces.
#
# This is the greppable, durable form of the spec's HARD DO-NOT block and the wave-review
# "DO-NOT compliance" lens. It scans the shipped copy of the value-first funnel surfaces (the offer
# card, save prompt, self-segment flow, checkout, add-to-home-screen invite, pre-exam calm ritual,
# pricing) for dark-pattern tokens and FAILS (exit 1) if any is present. It also asserts two POSITIVE
# invariants: the honest anti-subscription line IS on the offer/checkout surfaces, and the play loop
# stays content-never-gated (freemium inversion — only the intelligence layer is paid).
#
# It NEVER changes copy. A violation is a bug in the owning surface task (wave17-06..10), reported
# here, fixed there. Surfaces that have not shipped yet are SKIPPED (not failed), so this can run any
# time; a present file that carries a forbidden token still fails.
#
# Invocation:
#   bash scripts/funnel-donot-guard.sh      # or: npm run guard:funnel
#
# Grep hygiene (root CLAUDE.md): ERE only (grep -E), never BRE \+; Cyrillic patterns are case-EXPLICIT
# ([Пп]…) because BSD grep -i does not case-fold Cyrillic; no `|| true` masking on a check.
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }

# Emit a comment-stripped view of a source file so the guard scans SHIPPED COPY only — a doc comment
# that merely NAMES the forbidden tokens (e.g. "no scarcity / countdown / fake-discount") must not
# trip the gate (root CLAUDE.md whole-file-grep trap). Line numbers are preserved: `//` line comments
# keep their newline, and `/* … */` / `{/* … */}` blocks (incl. multi-line) collapse to their newlines.
strip_comments() {
  perl -0777 -pe 's{//[^\n]*}{}g; s{\{?/\*.*?\*/\}?}{ (my $m=$&) =~ tr/\n//cd; $m }ges' "$1"
}

# --- Funnel surfaces guarded. A missing file (surface not yet shipped) is skipped, never failed. ---
FUNNEL_FILES=(
  "app/page.tsx"                              # production landing route
  "app/landing-page.tsx"                     # production landing copy source
  "components/exam-access-offer.tsx"          # value-triggered 399 ₴ offer card (wave17-08)
  "components/save-progress-prompt.tsx"       # anon "save your progress" invite (wave17-06)
  "components/a2hs-prompt.tsx"                 # add-to-home-screen invite (wave17-10)
  "components/calm-ritual.tsx"                 # pre-exam calm ritual overlay
  "app/segment/page.tsx"                      # value-first self-segment flow (wave17-07)
  "app/actions/segment.ts"
  "app/(app)/pricing/page.tsx"                # pricing surface (wave17-09)
  "app/(app)/pricing/pricing-cta.tsx"
  "app/(app)/pricing/checkout/page.tsx"       # checkout surface (wave17-09)
  "app/actions/checkout.ts"
)

# Offer/checkout surfaces that MUST carry an honest anti-subscription line.
OFFER_CHECKOUT_FILES=(
  "components/exam-access-offer.tsx"
  "app/(app)/pricing/page.tsx"
  "app/(app)/pricing/checkout/page.tsx"
  "app/actions/checkout.ts"
)

# The play-loop actions that must stay reachable by an anon player (content-never-gated).
PLAY_ACTIONS="app/actions/test.ts"

present=()
for f in "${FUNNEL_FILES[@]}"; do
  [ -f "$f" ] && present+=("$f")
done

# --- 1. Absence of dark patterns in shipped funnel copy. -------------------------------------------
# label<TAB>ERE-pattern. A match in a present file is a DO-NOT violation. Fake-discount is scanned
# WITHOUT -i so the marketing token «SALE» matches only uppercase (never «wholesale» etc.).
DARK_PATTERNS=(
  $'timer / countdown urgency\tcountdown|[Цц]іна діє'
  $'phantom scarcity\tзалишилось [0-9]|купують'
  $'fake discount\tбуло [0-9]|SALE|[Зз]нижк'
  $'confirmshaming decline (dismiss must be «Не зараз»)\t[Нн]і, я не хоч'
  $'«Купити» buy CTA (the buy CTA must be outcome-named)\t[Кк]упити'
)

for f in "${present[@]}"; do
  code="$(strip_comments "$f")"   # shipped copy only — doc comments naming the tokens are excluded

  for entry in "${DARK_PATTERNS[@]}"; do
    label="${entry%%$'\t'*}"
    pat="${entry#*$'\t'}"
    if hits="$(grep -nE "$pat" <<<"$code")"; then
      fail "$f: $label — forbidden token in shipped copy:"$'\n'"$hits"
    fi
  done

  # Subscription / auto-renew claim on the one-time offer. The ALLOWED negations «не підписка» and
  # «Без підписки» are honest, REQUIRED copy — carve them out before flagging, so only a POSITIVE
  # subscription claim (e.g. «щомісячна підписка») trips the guard.
  if subs="$(grep -nE '[Пп]ідписк' <<<"$code" | grep -vE '[Нн]е[[:space:]]+[Пп]ідписк|[Бб]ез[[:space:]]+[Пп]ідписк')"; then
    fail "$f: positive subscription claim — only «не підписка»/«Без підписки» are allowed:"$'\n'"$subs"
  fi
done

# --- 2. Presence of the honest anti-subscription line on the offer/checkout surfaces. --------------
oc_present=0
anti_sub_found=0
for f in "${OFFER_CHECKOUT_FILES[@]}"; do
  [ -f "$f" ] || continue
  oc_present=1
  if strip_comments "$f" | grep -qE '[Нн]е[[:space:]]+[Пп]ідписк|[Бб]ез[[:space:]]+[Пп]ідписк'; then
    anti_sub_found=1
  fi
done
if [ "$oc_present" = 1 ] && [ "$anti_sub_found" = 0 ]; then
  fail "no anti-subscription line («не підписка»/«Без підписки») present on any offer/checkout surface"
fi

# --- 3. Freemium inversion: the play loop is content-never-gated. ----------------------------------
# startSession/submitAnswer resolve identity via requirePlayableUser (anon-reachable), and the play
# actions must NOT gate the question content behind an entitlement — only the intelligence layer is paid.
if [ -f "$PLAY_ACTIONS" ]; then
  play_code="$(strip_comments "$PLAY_ACTIONS")"
  grep -qE 'requirePlayableUser' <<<"$play_code" \
    || fail "$PLAY_ACTIONS: play actions must resolve identity via requirePlayableUser (content-never-gated)"
  if leaks="$(grep -nE 'requireIntelligenceAccess|checkIntelligenceAccess|requireEntitlement|EXAM_ACCESS' <<<"$play_code")"; then
    fail "$PLAY_ACTIONS: play/content path must NOT gate on an entitlement (freemium inversion — content is free):"$'\n'"$leaks"
  fi
fi

if [ ${#present[@]} -eq 0 ]; then
  echo "PASS: no wave-17 funnel surfaces present yet — nothing to guard."
else
  echo "PASS: wave-17 DO-NOT compliance clean across ${#present[@]} funnel surface(s)."
fi
