# First-party analytics — event taxonomy, privacy & retention

This app uses **first-party analytics only**: events are stored in our own database
(`AnalyticsEvent`), processed by our own code. There are **no third-party trackers, pixels, ad
networks, or external analytics SDKs**. Nothing leaves our server.

## How it flows

```
client (lib/client/track.ts)
  └─ batches non-PII interaction events (TrackBuffer, pure core in track-buffer.ts)
  └─ flushes via navigator.sendBeacon / fetch(keepalive) → POST /api/track
        └─ app/api/track/route.ts
             ├─ honours opt-out / DNT / GPC (record nothing, still ack 200)
             ├─ size-caps + zod-whitelists the batch (lib/analytics-ingest.ts)
             ├─ derives server context: hashed IP, device bucket, first-party anonymousId
             └─ recordEvents() → AnalyticsEvent rows (freeform "client_event" lane)
```

The typed server-side events (`recordEvent`, names in `ANALYTICS_EVENTS`) share the same table on
the `eventName` column; the client lane writes `eventName="client_event"` + a freeform `eventType`.

## Event taxonomy

### Server-side typed events (`lib/constants.ts` `ANALYTICS_EVENTS`)
Recorded by server actions / pages with a known `userId` (or null). No client involvement.

`user_registered`, `user_logged_in`, `user_logged_out`, `onboarding_completed`,
`category_selected`, `dashboard_viewed`, `test_started`, `question_answered`, `test_completed`,
`exam_simulation_passed`, `exam_simulation_failed`, `topic_practice_started`,
`mistake_practice_started`, `question_saved`, `question_unsaved`, `admin_question_created`,
`admin_question_updated`, `admin_question_published`, `admin_question_archived`.

### Client interaction events (`eventType` on the freeform lane)
Emitted by the client tracker. All are anonymous unless a session attributes them to a user.

| eventType | When | Notable fields (never PII) |
|---|---|---|
| `page_view` | every App Router route change | `path`, `referrer` (prev path), `sessionId`, `viewport` |
| `time_on_page` | when leaving a page | `path` (the page left), `durationMs` |
| `click` | delegated listener on any link/button/`[role]`/`[data-track]` | `elementType` (`tag[role]`), `elementLabel` (data-track-label / aria-label / capped visible text — **never an input value**), `metadata` (data-track-* extras) |
| `test_option_selected` | answer option chosen in the runner | `metadata: { mode, questionIndex, optionIndex }` — ordinal only, never the answer text/correctness |
| `test_next_clicked` | «Далі» in the runner | `metadata: { mode, questionIndex }` |
| `test_question_flagged` | flag-for-review toggled | `metadata: { mode, flagged, questionIndex }` |
| `test_finish_clicked` | «Завершити тест» | `metadata: { mode, answered, total }` |

`data-track-label` is added to nav links, dashboard start/recommend CTAs, and onboarding so the
generic `click` events carry clean labels.

## Identifiers

- **anonymousId** (`ds_anon`): stable, opaque, first-party visitor id. **Minted server-side** into
  an httpOnly cookie — the client cannot read or spoof it. Lets us correlate a visitor over time
  without any third party.
- **sessionId** (`ds_session`, sessionStorage): rotates per browsing session; sent in the body.
- **ipHash**: `SHA-256(salt + ":" + ip)`. The **raw IP is never stored or logged** — only the hash,
  and the salt makes it non-reversible + rotatable (`lib/analytics-salt.ts`).
- **deviceType**: coarse bucket (`mobile`/`tablet`/`desktop`) from the UA — low entropy.

## What is NEVER collected/stored

- Raw IP addresses (only a salted hash).
- Passwords or password hashes.
- Answer **text or correctness tied to identity** beyond the existing typed `question_answered`
  event model (the client lane records only ordinal positions, e.g. `optionIndex`).
- Raw form-field **values** of any kind (the click handler never reads `.value`; the server zod
  schema is an allow-list that strips any unknown key, so a client cannot smuggle extra columns).
- Any third-party identifier.

## Opt-out & Do-Not-Track

First-party analytics is **on by default**, but suppressed whenever any of these is true — in which
case the client sends nothing AND the server records nothing (it still acks 200 so a beacon can't
probe internals):

- `ds_no_analytics` opt-out cookie set (Account → Конфіденційність toggle; persisted server-side and
  mirrored client-side so the running tracker stops immediately).
- Browser **Do Not Track** (`navigator.doNotTrack` / `DNT: 1`).
- **Global Privacy Control** (`navigator.globalPrivacyControl` / `Sec-GPC: 1`).

The privacy notice in `components/brand.tsx` (`LegalDisclaimer`) states this in plain Ukrainian.

## Retention

`AnalyticsEvent` rows are operational telemetry, not a permanent user record. Recommended policy
for this MVP:

- **Raw client interaction events**: retain ~90 days, then delete or aggregate. They carry only
  pseudonymous identifiers (anonymousId / ipHash) + non-PII fields.
- **Typed product events**: retain as needed for product metrics; they reference `userId` and are
  removed if/when a user account is deleted (the FK lets a deletion cascade/null them).
- There is **no automated pruning job yet** — when added, it should `DELETE FROM AnalyticsEvent`
  past the window. Until then, retention is bounded only by manual cleanup. (Tracked as a follow-up.)

Because everything is first-party and pseudonymous, and a user can opt out at any time (and DNT/GPC
are honoured automatically), this stays consistent with the app's demo/preparation-tool positioning.
