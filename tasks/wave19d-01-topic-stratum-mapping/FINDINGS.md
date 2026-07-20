# FINDINGS — wave19d-01 topic→stratum mapping (cat-B official blueprint)

**INVESTIGATION-ONLY.** This task modifies NO lib/app/schema file. Its sole deliverable is this
`FINDINGS.md` + `verify.sh`. It decides the data-driven **section → official-stratum** mapping so that
task 03 can wire `CATEGORY_B_BLUEPRINT` from a settled table instead of guessing. No test, no oracle,
no fixture, no behaviour change ⇒ the structural verify traps (self-referential/weakened test,
fixture-population dodge) are inapplicable by construction; the criteria below are confirmed by a direct
READ of this file + the captured query output.

## Evidence sources
1. **Live `prisma/dev.db`** — the section-inventory query in `verify.sh` (published, active, non-archived
   cat-B questions grouped by the наказ section decoded from `questionKey = q_<section>_<qnum>`, i.e.
   `sectionFromQuestionKey`, `lib/content-key.ts`). Verbatim output captured in
   `PREVERIFY-OUTPUT.txt` (static evidence — read, do not run).
2. **`docs/research/OFFICIAL-EXAM-STRUCTURE-2026-07-13.md`** — the ГСЦ МВС official 4-strata blueprint
   (R1 answer).

## Official stratum quotas (verbatim from the source doc) — FIXED, not ranged
ГСЦ МВС (12.09.2025): «Питання розподіляються за таким принципом: **10 питань – з правил дорожнього
руху; 4 – з основ безпеки руху; 4 – з будови та експлуатації транспортного засобу відповідної
категорії; 2 – з надання першої домедичної допомоги.»

| stratum key | official stratum | quota | ranged? |
|-------------|------------------|-------|---------|
| `pdr`       | правила дорожнього руху (ПДР) | **10** | FIXED |
| `safety`    | основи безпеки руху           | **4**  | FIXED |
| `structure` | будова та експлуатація ТЗ     | **4**  | FIXED |
| `medical`   | надання домедичної допомоги   | **2**  | FIXED |
| — sum —     |                               | **20** | |

All four quotas are exact integers (`10 · 4 · 4 · 2`), summing to 20 — **not** ranges. Below these four
strata **no finer official quota exists** (знаки/розмітка/перехрестя… all sit inside the ПДР-10 stratum).

## Fallback / remainder rule (stated explicitly)
`pdr` is the **remainder** stratum (task 03's `remainderKey`): any section not *clearly* belonging to
безпека руху (`safety`), будова/експлуатація (`structure`), or домедична (`medical`) folds into `pdr`.
Its section list is derived by **exclusion** and is listed below only for auditability. **DEFAULT for
anything ambiguous = `pdr`.**

## Section → stratum table (one row per section present in a published cat-B question)
Every distinct section observed in the live query is assigned to exactly one of the four strata; no
section is unassigned, none is in two strata.

| §  | topic title                                                   | pub | stratum     | note |
|----|---------------------------------------------------------------|-----|-------------|------|
| 1  | ЗАГАЛЬНІ ПОЛОЖЕННЯ                                             | 79  | `pdr`       | ПДР core |
| 2  | ОБОВ'ЯЗКИ І ПРАВА ВОДІЇВ МТЗ                                   | 37  | `pdr`       | ПДР core |
| 3  | РУХ ТЗ ІЗ СПЕЦІАЛЬНИМИ СИГНАЛАМИ                               | 16  | `pdr`       | ПДР core |
| 4  | ОБОВ'ЯЗКИ І ПРАВА ПІШОХОДІВ                                    | 26  | `pdr`       | ПДР core |
| 5  | ОБОВ'ЯЗКИ І ПРАВА ПАСАЖИРІВ                                    | 16  | `pdr`       | ПДР core |
| 6  | ВИМОГИ ДО ВЕЛОСИПЕДИСТІВ                                       | 22  | `pdr`       | ПДР core |
| 7  | ВИМОГИ ДО ОСІБ, ЯКІ КЕРУЮТЬ ГУЖОВИМ ТРАНСПОРТОМ                | 8   | `pdr`       | ПДР core |
| 8  | РЕГУЛЮВАННЯ ДОРОЖНЬОГО РУХУ (перехрестя)                       | 91  | `pdr`       | ПДР core |
| 9  | ПОПЕРЕДЖУВАЛЬНІ СИГНАЛИ                                        | 60  | `pdr`       | ПДР core |
| 10 | ПОЧАТОК РУХУ ТА ЗМІНА ЙОГО НАПРЯМКУ                            | 76  | `pdr`       | ПДР core |
| 11 | РОЗТАШУВАННЯ ТЗ НА ДОРОЗІ                                      | 39  | `pdr`       | ПДР core |
| 12 | ШВИДКІСТЬ РУХУ                                                 | 41  | `pdr`       | ПДР core |
| 13 | ДИСТАНЦІЯ, ІНТЕРВАЛ, ЗУСТРІЧНИЙ РОЗ'ЇЗД                        | 13  | `pdr`       | ПДР core |
| 14 | ОБГІН                                                         | 56  | `pdr`       | ПДР core |
| 15 | ЗУПИНКА І СТОЯНКА                                              | 97  | `pdr`       | ПДР core |
| 16 | ПРОЇЗД ПЕРЕХРЕСТЬ                                              | 142 | `pdr`       | ПДР core |
| 17 | ПЕРЕВАГИ МАРШРУТНИХ ТЗ                                         | 11  | `pdr`       | ПДР core |
| 18 | ПРОЇЗД ПІШОХІДНИХ ПЕРЕХОДІВ І ЗУПИНОК                          | 19  | `pdr`       | ПДР core |
| 19 | КОРИСТУВАННЯ ЗОВНІШНІМИ СВІТЛОВИМИ ПРИЛАДАМИ                   | 33  | `pdr`       | ПДР core |
| 20 | РУХ ЧЕРЕЗ ЗАЛІЗНИЧНІ ПЕРЕЇЗДИ                                  | 31  | `pdr`       | ПДР core |
| 21 | ПЕРЕВЕЗЕННЯ ПАСАЖИРІВ                                          | 12  | `pdr`       | ПДР core |
| 22 | ПЕРЕВЕЗЕННЯ ВАНТАЖУ                                            | 6   | `pdr`       | ПДР core |
| 23 | БУКСИРУВАННЯ ТА ЕКСПЛУАТАЦІЯ ТЗ-СОСТАВІВ                       | 20  | `pdr`       | ПДР core (rule of the road, not vehicle construction) |
| 24 | НАВЧАЛЬНА ЇЗДА                                                 | 14  | `pdr`       | ПДР core |
| 25 | РУХ ТЗ У КОЛОНАХ                                               | 8   | `pdr`       | ПДР core |
| 26 | РУХ У ЖИТЛОВІЙ ТА ПІШОХІДНІЙ ЗОНІ                              | 12  | `pdr`       | ПДР core |
| 27 | РУХ ПО АВТОМАГІСТРАЛЯХ                                         | 13  | `pdr`       | ПДР core |
| 28 | РУХ ПО ГІРСЬКИХ ДОРОГАХ І НА КРУТИХ СПУСКАХ                    | 8   | `pdr`       | ПДР core |
| 29 | МІЖНАРОДНИЙ РУХ                                                | 1   | `pdr`       | ПДР core |
| 30 | НОМЕРНІ, РОЗПІЗНАВАЛЬНІ ЗНАКИ, НАПИСИ І ПОЗНАЧЕННЯ             | 14  | `pdr`       | ПДР core |
| 31 | ТЕХНІЧНИЙ СТАН ТЗ ТА ЇХ ОБЛАДНАННЯ                            | 18  | **`structure`** | ANCHOR: будова/експлуатація |
| 32 | ОКРЕМІ ПИТАННЯ ДР, ЩО ПОТРЕБУЮТЬ УЗГОДЖЕННЯ                    | 5   | `pdr`       | ПДР core |
| 33 | ДОРОЖНІ ЗНАКИ                                                  | 357 | `pdr`       | ANCHOR: fine ПДР section folds into ПДР-10 |
| 34 | ДОРОЖНЯ РОЗМІТКА                                               | 35  | `pdr`       | ANCHOR: fine ПДР section folds into ПДР-10 |
| 35 | ОСНОВИ БЕЗПЕЧНОГО ВОДІННЯ                                      | 170 | **`safety`**    | ANCHOR: основи безпеки руху |
| 36 | ОСНОВИ ПРАВА В ОБЛАСТІ ДОРОЖНЬОГО РУХУ                         | 8   | `pdr`       | AMBIGUOUS→pdr: legal-basis topic, not безпека/будова/домедична ⇒ remainder |
| 37 | НАДАННЯ ДОМЕДИЧНОЇ ДОПОМОГИ                                    | 59  | **`medical`**   | ANCHOR: домедична допомога |
| 38 | ЕТИКА ВОДІННЯ, КУЛЬТУРА ТА ВІДПОЧИНОК ВОДІЯ                    | 14  | `pdr`       | AMBIGUOUS→pdr: driver-ethics, not безпека/будова/домедична ⇒ remainder |
| 39 | ЄВРОПРОТОКОЛ                                                   | 6   | `pdr`       | AMBIGUOUS→pdr: post-crash paperwork, not безпека/будова/домедична ⇒ remainder |
| 44 | ДОДАТКОВІ ПИТАННЯ КАТ. В1/В (ЗАГАЛЬНІ)                         | 16  | `pdr`       | AMBIGUOUS→pdr: cat-B "general", not clearly будова/безпека ⇒ remainder |
| 45 | ДОДАТКОВІ ПИТАННЯ КАТ. В1/В (БУДОВА І ТЕРМІНИ)                 | 32  | **`structure`** | ANCHOR: будова/експлуатація |
| 46 | ДОДАТКОВІ ПИТАННЯ КАТ. В1/В (ЮРИДИЧНА ВІДПОВІДАЛЬНІСТЬ)        | 9   | `pdr`       | AMBIGUOUS→pdr: legal-liability, not безпека/будова/домедична ⇒ remainder |
| 47 | ДОДАТКОВІ ПИТАННЯ КАТ. В1/В (БЕЗПЕКА)                          | 7   | **`safety`**    | ANCHOR: основи безпеки руху |

## Stratum membership + availability (published cat-B, live dev.db)

| stratum key | sections                                     | pub available | official quota | ≥ quota? |
|-------------|----------------------------------------------|---------------|----------------|----------|
| `medical`   | §37                                          | **59**        | 2              | ✅ |
| `structure` | §31, §45                                     | **50** (18+32)| 4              | ✅ |
| `safety`    | §35, §47                                     | **177** (170+7)| 4             | ✅ |
| `pdr`       | REMAINDER — §1–§30, §32, §33, §34, §36, §38, §39, §44, §46 | **1471** | 10 | ✅ |
| **total**   | all 43 observed sections                     | **1757**      | 20             | |

`pdr` availability is derived by exclusion: total 1757 − medical 59 − structure 50 − safety 177 = **1471**.
Every stratum has far more published questions than its fixed quota, so task 04's per-block availability
guard (4/4/2/10) is satisfiable on the real seed.

## Notes for task 03 / 04
- Task 03 keys blocks on `sections` (drift-immune `questionKey` source), NOT `Topic.displayOrder` (which
  drifts +101 on the live seed). This table IS that section→block decision.
- `pdr` is `remainderKey`; its sections list above is auditability only — task 03 derives it by exclusion.
- The wave19b 6-way split (structure 50 · medicine 59 · law 37 · general 16 · safety 177 · pdr 1418,
  sum 1757) collapses here to the official 4 strata by folding **law (§36+§38+§39+§46 = 37)** and
  **general (§44 = 16)** into `pdr` ⇒ `pdr` 1418 + 37 + 16 = **1471**. Same 1757 total, cross-checked.
