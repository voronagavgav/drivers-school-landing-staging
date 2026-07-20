# Corrections overrides

Per-question hand-authored corrections that the official-content loader
(`scripts/import-official.ts`) applies ON TOP OF the derived plan content on every
import. Use these to fix a transcription error, swap an option, move a question to a
different topic, etc. **without** editing the regenerable pipeline output
(`import_plan.json`).

## File shape

One file per question, named by its stable **questionKey** (see `lib/content-key.ts`,
e.g. `q_11_7.json` for section 11, question 7):

```
.content-import/overrides/<questionKey>.json
```

Each file is a JSON object carrying **any subset** of the overridable top-level fields.
A field that is **present** REPLACES the plan's value wholesale (shallow, override-wins);
an **absent** field keeps the plan's value. An explicit `null` is a deliberate clear.

| field         | shape                                  | meaning                                              |
| ------------- | -------------------------------------- | ---------------------------------------------------- |
| `text`        | string                                 | question text                                        |
| `options`     | `[{ "n": number, "text": string }]`    | full option set (1-based `n`); replaces ALL options  |
| `answer`      | number                                 | 1-based correct option `n` (pair with `options`)     |
| `topic`       | string                                 | official topic title (find-or-created on import)     |
| `categories`  | `string[]`                             | category codes, e.g. `["A","B","C"]` (must be seeded) |
| `explanation` | `{ shortText, detailedText, legalReference, reviewedStatus }` | replaces the whole explanation object |
| `imageKey`    | string \| null                         | image basename without extension; `null` clears it   |

### Example

```json
{ "text": "Виправлений текст питання", "answer": 2 }
```

## Rules

- A **missing** override file = plan unchanged.
- A **malformed** JSON file fails the import LOUDLY (throws with the offending key) — a
  corrections file that doesn't load is a bug, not a no-op.
- Fields outside the table above are ignored by the merge.
- The merge is the pure `applyOverride` in `lib/content-override.ts`; keep this list in
  sync with `OVERRIDABLE_FIELDS` there and with `docs/CONTENT-ARCHITECTURE.md`.

This directory and its README are committed (so the path is real on a fresh checkout)
even though `.content-import/` mostly holds regenerable artifacts. Actual `<key>.json`
correction files are committed individually as they are authored.
