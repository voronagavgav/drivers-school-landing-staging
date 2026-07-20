# ops/ — on-box operational jobs

## nightly-readiness (NOT auto-installed — requires owner action)
Recomputes TopicMastery + ReadinessSnapshot + calibration slope for every user with ReviewState and
prunes old analytics events, daily at 03:30 (script: `scripts/nightly-readiness.ts`; safe alongside
the running LAN server — data writes don't take the schema lock). Without it, snapshots refresh only
on session finish (staleness is conservative but real).

Install (one-time, as the login user):

    cp ops/com.drivers-school.nightly-readiness.plist ~/Library/LaunchAgents/
    launchctl load ~/Library/LaunchAgents/com.drivers-school.nightly-readiness.plist

Verify: `launchctl list | grep drivers-school`; logs at `var/log/nightly-readiness.log`.
Manual run: `npx tsx --conditions=react-server scripts/nightly-readiness.ts`.

### Elo item-difficulty recompute (Wave 22)
The nightly pass ALSO runs a full deterministic Elo/Rasch item-difficulty recompute (`recomputeElo`,
`lib/server/elo.ts`) once per run — it replays the whole first-attempt answer stream through the pure
`foldEloStream` estimator and writes each item's `Question.eloBeta`/`eloAnswerCount` back in ≤200-id
chunks. It has NO time-decay, so it is idempotent (running it twice yields byte-identical β/n). No extra
launchd entry is needed — it is a step inside `scripts/nightly-readiness.ts`.

Manual Elo-only run: `npx tsx --conditions=react-server scripts/elo-recompute.ts` (owns its own libsql
Prisma client; prints an `elo recompute` summary line with the answers-folded + items-written counts).
