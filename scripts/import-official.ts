import "dotenv/config";
import { readFileSync, copyFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { questionKey, optionKey } from "../lib/content-key";
import { applyOverride, type OverrideEntry } from "../lib/content-override";

// ---------------------------------------------------------------------------
// Import REAL official ПДР questions (HSC / ГСЦ МВС question base, наказ 04.09.2025)
// from the validated pipeline output (.content-import/import_plan.json).
//
// These are the official published state question texts + the official answer key — so
// sourceType="OFFICIAL", isDemo=false. The platform still makes NO claim to BE the official
// exam, to replace practical lessons, to guarantee passing, or to have live МВС integration.
// Answers come from the official answer-key table, machine-transcribed + count-validated per
// section + range-checked; reviewedStatus stays UNREVIEWED pending human review.
//
// Only text-only questions in count-matched sections are imported (image questions deferred).
// Idempotent UPSERT-by-content-key: each question/option is reconciled by its stable key from
// lib/content-key.ts (ids preserved on update), and NO user-progress row is ever deleted —
// questions that vanished upstream are DEACTIVATED, not removed. Runs under tsx (own client).
// ---------------------------------------------------------------------------

const VERSION_NAME = "Офіційна база тестових питань ПДР (ГСЦ МВС, наказ від 04.09.2025)";
const OFFICIAL_REF = "Офіційна база тестових питань для теоретичного іспиту (ГСЦ МВС, наказ від 04.09.2025)";
const OFFICIAL_TOPIC_DESC = "Офіційний розділ ПДР (ГСЦ МВС)";

type PlanQ = {
  label: string;
  section_title: string;
  qnum: number;
  text: string;
  options: { n: number; text: string }[];
  answer: number;
  image?: string;       // basename, e.g. "16_2_1_0.jpeg"
  image_src?: string;   // path under .content-import, e.g. "images/16_2_1_0.jpeg"
};

const IMG_SRC_DIR = path.join(process.cwd(), ".content-import");
const IMG_DEST_DIR = path.join(process.cwd(), "public", "official-images");

// Grounded, orientational study-aid explanations, merged from the generation +
// independent-verify pipeline (see .content-import/merge_explanations.py). Keyed by
// "<label>:<qnum>". reviewedStatus = "REVIEWED" only for independently-verified items;
// everything else is "UNREVIEWED" and the UI labels it as auto-generated/orientational.
// These are NEVER claimed authoritative — legalReference stays orientational.
type ExplanationEntry = {
  short: string | null;
  detailed: string | null;
  legalRef: string | null;
  reviewedStatus: string;
};
const EXPL_PATH = path.join(process.cwd(), ".content-import", "explanations.json");
const explanations: Record<string, ExplanationEntry> = existsSync(EXPL_PATH)
  ? (JSON.parse(readFileSync(EXPL_PATH, "utf-8")) as Record<string, ExplanationEntry>)
  : {};

// Quarantine: "<label>:<qnum>" keys whose answer key was flagged as suspect and is NOT
// yet ground-truth-resolved (e.g. image-based questions awaiting a vision pass). Imported
// but kept UNPUBLISHED so a reseed never silently serves a possibly-wrong answer. Empty by
// default. Populated/cleared as conflicts get verified (see .content-import/expl_audit/).
const QUARANTINE_PATH = path.join(process.cwd(), ".content-import", "quarantine.json");
const quarantined = new Set<string>(
  existsSync(QUARANTINE_PATH)
    ? (JSON.parse(readFileSync(QUARANTINE_PATH, "utf-8")) as string[])
    : [],
);

// Hand-authored SVG diagrams for questions: "<label>:<qnum>" -> svg filename in
// .content-import/question-svgs/. Vector, exact, version-controlled — used to add a
// diagram to a question that lacks one, or (later) to replace an illegible scan.
// Copied into public/official-images/ on import and served like any other question image.
const SVG_SRC_DIR = path.join(process.cwd(), ".content-import", "question-svgs");
const QSVG_PATH = path.join(SVG_SRC_DIR, "index.json");
const questionSvgs: Record<string, string> = existsSync(QSVG_PATH)
  ? (JSON.parse(readFileSync(QSVG_PATH, "utf-8")) as Record<string, string>)
  : {};

// Corrections-override layer (task 06): per-question hand-authored fixes keyed by the
// stable questionKey, in .content-import/overrides/<questionKey>.json. Each file carries
// any SUBSET of the overridable top-level fields (OVERRIDABLE_FIELDS in lib/content-override.ts:
// text, options [{n,text}], answer, topic, categories, explanation, imageKey) in the PLAN's
// vocabulary; a present field REPLACES the plan's value wholesale (override-wins, shallow).
// The merge itself is the pure applyOverride — the loader only does the disk read here.
// A MISSING file = plan unchanged (null). A PRESENT-but-malformed file throws LOUDLY with the
// offending key: a corrections file that doesn't load is a bug, never a silent no-op.
const OVERRIDE_DIR = path.join(process.cwd(), ".content-import", "overrides");
function readOverride(qKey: string): OverrideEntry | null {
  const p = path.join(OVERRIDE_DIR, `${qKey}.json`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as OverrideEntry;
  } catch (e) {
    throw new Error(
      `corrections override for ${qKey} is malformed JSON (${p}): ${(e as Error).message}`,
    );
  }
}

// All category codes this importer may assign (must exist as seeded Category rows).
const CATEGORY_CODES = ["A", "B", "C", "D", "T", "BE", "CE", "DE"] as const;

// section number (int before any ".") -> which category codes it applies to.
// Section→category mapping follows the official section titles (наказ 04.09.2025):
//   §52–55 "КАТЕГОРІЙ D1, D"; §56–59 "КАТЕГОРІЙ BE, C1E, CE, D1E, DE"; §60–63 "КАТЕГОРІЇ T".
function categoriesFor(label: string): string[] | null {
  const n = parseInt(label.split(".")[0], 10);
  if (n >= 1 && n <= 39) return ["A", "B", "C"]; // common theory
  if (n >= 40 && n <= 43) return ["A"];
  if (n >= 44 && n <= 47) return ["B"];
  if (n >= 48 && n <= 51) return ["C"];
  if (n >= 52 && n <= 55) return ["D"];
  if (n >= 56 && n <= 59) return ["BE", "CE", "DE"]; // combined trailer categories
  if (n >= 60 && n <= 63) return ["T"];              // tractor (code "T", displayed "Т")
  return null;
}

// Reusable importer: loads the official ПДР content into the DB using the CALLER's PrismaClient
// (so prisma/seed.ts can reuse this exact logic with its own client — one import implementation,
// no second copy). Idempotent UPSERT-by-content-key — preserves all user progress (see header).
// Throws on integrity failure. Importing this module does NOT run anything — only the CLI guard
// at the bottom auto-runs.
export async function importOfficial(prisma: PrismaClient) {
  const planPath = path.join(process.cwd(), ".content-import", "import_plan.json");
  const plan: PlanQ[] = JSON.parse(readFileSync(planPath, "utf-8"));

  // ---- find-or-create the official content version (UPSERT-by-key, NOT delete-recreate) ----
  // The loader UPSERTS each question/option by its stable content key and PRESERVES every
  // user-progress row: TestAnswer / TestSessionQuestion / UserMistake / SavedQuestion are NEVER
  // deleted here. A prior official question that has vanished from the source set is DEACTIVATED
  // (isActive=false, isPublished=false) at the end — never hard-deleted — so its referencing
  // history survives. Keys are derived ONLY via lib/content-key.ts (single source of format).
  const version =
    (await prisma.contentVersion.findFirst({ where: { name: VERSION_NAME } })) ??
    (await prisma.contentVersion.create({
      data: {
        name: VERSION_NAME,
        source: "ГСЦ МВС (hsc.gov.ua)",
        description:
          "Офіційні тестові питання та правильні відповіді для теоретичного іспиту (наказ ГСЦ МВС від 04.09.2025). " +
          "Імпортовано лише текстові питання (без зображень) із перевірених розділів. Платформа не є офіційним іспитом і не гарантує його складання.",
        isActive: true,
        publishedAt: new Date(),
      },
    }));

  // reset locally-hosted official images (idempotent; the resolver prefers restyled/override tiers)
  if (existsSync(IMG_DEST_DIR)) rmSync(IMG_DEST_DIR, { recursive: true, force: true });
  mkdirSync(IMG_DEST_DIR, { recursive: true });

  const cats = await prisma.category.findMany({ where: { code: { in: [...CATEGORY_CODES] } } });
  const catId: Record<string, string> = {};
  for (const c of cats) catId[c.code] = c.id;

  // group plan by section label, in first-seen order
  const sections: { label: string; title: string; qs: PlanQ[] }[] = [];
  const idx = new Map<string, number>();
  for (const p of plan) {
    if (!categoriesFor(p.label)) continue; // skip unmapped (D/T/BE)
    if (!idx.has(p.label)) {
      idx.set(p.label, sections.length);
      sections.push({ label: p.label, title: p.section_title, qs: [] });
    }
    sections[idx.get(p.label)!].qs.push(p);
  }

  // Fingerprint a question's FULL content (text + image + sorted option texts + which is correct)
  // so an exact within-section duplicate can be detected. The option set is sorted by text and the
  // correct one is flagged inline, so option ORDER doesn't matter but option CONTENT + the answer do.
  function contentFingerprint(q: PlanQ): string {
    const opts = [...q.options]
      .map((o) => `${o.text}${o.n === q.answer ? "1" : "0"}`)
      .sort();
    return [q.text, q.image ?? "", ...opts].join("");
  }

  let order = 100; // official topics sort after the demo topics
  let nQ = 0;
  let nSkippedDup = 0;
  let nWithExpl = 0;   // questions that got a merged grounded explanation
  let nReviewed = 0;   // ...of which were independently REVIEWED
  const desiredKeys = new Set<string>(); // every questionKey present in the new source set
  for (const s of sections) {
    const codes = categoriesFor(s.label)!;
    // Skip a section whose mapped categories aren't all seeded (e.g. DB seeded before
    // the D/T/BE/CE/DE rows existed) — never connect to an undefined category id.
    const missing = codes.filter((c) => !catId[c]);
    if (missing.length) {
      console.log(`  [${s.label}] SKIP — missing seeded categories: ${missing.join(", ")}`);
      continue;
    }
    // Find-or-create the section topic (idempotent — the loader no longer deletes topics).
    const topic =
      (await prisma.topic.findFirst({ where: { title: s.title, description: OFFICIAL_TOPIC_DESC } })) ??
      (await prisma.topic.create({
        data: { title: s.title, description: OFFICIAL_TOPIC_DESC, displayOrder: order, isActive: true },
      }));
    order++;
    // Within-section identical-question dedup: drop a question whose FULL content exactly matches one
    // already imported IN THIS SAME SECTION. Scoped to the section only — the intentional cross-
    // section repeats (e.g. the §44–47 category-additional sections re-stating general questions) are
    // PRESERVED because this set is reset per section.
    const seenInSection = new Set<string>();
    let nDupInSection = 0;
    for (const q of s.qs) {
      const fp = contentFingerprint(q);
      if (seenInSection.has(fp)) {
        nDupInSection += 1;
        nSkippedDup += 1;
        continue;
      }
      seenInSection.add(fp);
      // The importer sets a stable imageKey (image basename WITHOUT extension) and copies the
      // original bytes into the original tier (public/official-images/). It NO LONGER writes a
      // served path: the resolver (lib/server/q-image + /api/q-image/<key>) owns serving and
      // prefers the restyled-live/override tiers over the original — so a re-import can never
      // clobber a go-live. imageKey is null for questions with no image/SVG.
      let imageKey: string | null = null;
      if (q.image && q.image_src) {
        copyFileSync(path.join(IMG_SRC_DIR, q.image_src), path.join(IMG_DEST_DIR, q.image));
        imageKey = path.parse(q.image).name;
      } else if (questionSvgs[`${q.label}:${q.qnum}`]) {
        const svgFile = questionSvgs[`${q.label}:${q.qnum}`];
        copyFileSync(path.join(SVG_SRC_DIR, svgFile), path.join(IMG_DEST_DIR, svgFile));
        imageKey = path.parse(svgFile).name;
      }

      // Attach the merged grounded explanation when one exists for this (label,qnum).
      // shortText = the short orientation line; detailedText = the longer note (or null);
      // legalReference = the orientational ПДР pointer (or the official-base ref fallback);
      // reviewedStatus carries through so the UI can label UNREVIEWED items as auto-generated.
      const qkey = `${q.label}:${q.qnum}`;
      const expl = explanations[qkey];
      const explanationData = expl
        ? {
            shortText: expl.short,
            detailedText: expl.detailed,
            legalReference: expl.legalRef ?? OFFICIAL_REF,
            reviewedStatus: expl.reviewedStatus || "UNREVIEWED",
          }
        : { legalReference: OFFICIAL_REF, reviewedStatus: "UNREVIEWED" };
      if (expl) nWithExpl += 1;
      if (expl && expl.reviewedStatus === "REVIEWED") nReviewed += 1;

      const qKey = questionKey(q.label, q.qnum);

      // ---- corrections-override layer (task 06) --------------------------------
      // Build the plan-vocabulary content entry, then merge the optional hand-authored
      // override OVER it via the pure applyOverride (override-wins, shallow per field).
      // The upsert data below is derived from the MERGED entry, so a present override
      // field WINS over the plan field; a missing override file leaves the plan as-is.
      const planEntry = {
        text: q.text,
        options: q.options,
        answer: q.answer,
        topic: s.title,
        categories: codes,
        explanation: explanationData,
        imageKey,
      };
      const merged = applyOverride(planEntry, readOverride(qKey));

      const sortedOpts = [...merged.options].sort((a, b) => a.n - b.n);
      const content = {
        text: merged.text,
        imageKey: merged.imageKey,
        difficulty: 1,
        isPublished: !quarantined.has(qkey),
        options: sortedOpts.map((o, i) => ({
          optionKey: optionKey(qKey, o.n),
          text: o.text,
          isCorrect: o.n === merged.answer,
          displayOrder: i,
        })),
        explanation: merged.explanation,
      };
      desiredKeys.add(qKey);

      // Resolve the (possibly overridden) topic + categories. Without an override these
      // are the section's topic and mapped category codes; an override may move the
      // question to a different official topic / category set (find-or-create the topic;
      // reject categories that aren't seeded so a bad override fails loudly).
      let topicId = topic.id;
      if (merged.topic !== s.title) {
        const ovTopic =
          (await prisma.topic.findFirst({
            where: { title: merged.topic, description: OFFICIAL_TOPIC_DESC },
          })) ??
          (await prisma.topic.create({
            data: {
              title: merged.topic,
              description: OFFICIAL_TOPIC_DESC,
              displayOrder: order++,
              isActive: true,
            },
          }));
        topicId = ovTopic.id;
      }
      const missingMergedCats = merged.categories.filter((c) => !catId[c]);
      if (missingMergedCats.length) {
        throw new Error(
          `override for ${qKey} references unseeded categories: ${missingMergedCats.join(", ")}`,
        );
      }

      // UPSERT the question by its content key — on UPDATE the existing row's id is PRESERVED, so
      // every TestAnswer/UserMistake/SavedQuestion FK stays valid; isActive is restored in case the
      // row had been deactivated by a prior run. NOTHING is deleted on this path.
      const categoryConnect = merged.categories.map((c) => ({ id: catId[c] }));
      const row = await prisma.question.upsert({
        where: { questionKey: qKey },
        create: {
          questionKey: qKey,
          text: content.text,
          topicId,
          difficulty: content.difficulty,
          imageKey: content.imageKey,
          sourceType: "OFFICIAL",
          isDemo: false,
          isActive: true,
          isPublished: content.isPublished,
          contentVersionId: version.id,
          categories: { connect: categoryConnect },
        },
        update: {
          text: content.text,
          topicId,
          difficulty: content.difficulty,
          imageKey: content.imageKey,
          isActive: true,
          isPublished: content.isPublished,
          contentVersionId: version.id,
          categories: { set: categoryConnect },
        },
        select: { id: true },
      });

      // Reconcile options by optionKey (id preserved on update; created on first import).
      for (const o of content.options) {
        await prisma.questionOption.upsert({
          where: { optionKey: o.optionKey },
          create: {
            optionKey: o.optionKey,
            questionId: row.id,
            text: o.text,
            isCorrect: o.isCorrect,
            displayOrder: o.displayOrder,
          },
          update: {
            questionId: row.id,
            text: o.text,
            isCorrect: o.isCorrect,
            displayOrder: o.displayOrder,
          },
        });
      }
      // Remove options whose key is no longer in the source set, but ONLY when no TestAnswer
      // references them — a referenced surplus option is LEFT in place to preserve the answer
      // history (and never break the FK). A left-over option is harmless: it is out of the current
      // source set and is never re-served.
      const wantedOptionKeys = new Set(content.options.map((o) => o.optionKey));
      const existingOptions = await prisma.questionOption.findMany({
        where: { questionId: row.id },
        select: { id: true, optionKey: true, _count: { select: { selectedInAnswers: true } } },
      });
      for (const eo of existingOptions) {
        if (eo.optionKey && wantedOptionKeys.has(eo.optionKey)) continue;
        if (eo._count.selectedInAnswers === 0) {
          await prisma.questionOption.delete({ where: { id: eo.id } });
        }
      }

      // Upsert the 1:1 explanation (questionId is @unique).
      await prisma.questionExplanation.upsert({
        where: { questionId: row.id },
        create: { questionId: row.id, ...content.explanation },
        update: { ...content.explanation },
      });

      nQ += 1;
    }
    const dupNote = nDupInSection ? ` (skipped ${nDupInSection} in-section dup)` : "";
    console.log(`  [${s.label}] +${s.qs.length - nDupInSection} → ${s.title.slice(0, 40)}${dupNote}`);
  }

  // Deactivate official questions that exist in the DB but are ABSENT from the new source set
  // (renumbered/retired upstream). They are NEVER hard-deleted — flipping isActive/isPublished off
  // preserves every TestAnswer/UserMistake/SavedQuestion that still references them. Keyless legacy
  // rows (questionKey IS NULL) are left untouched — a production cutover of those is out of scope.
  // The absent set is diffed in JS (then updated by id in chunks) so we never pass the full key
  // list as bound parameters — a `notIn` of ~1.7k keys exceeds the driver's query-parameter cap.
  const activeOfficial = await prisma.question.findMany({
    where: { sourceType: "OFFICIAL", isActive: true, questionKey: { not: null } },
    select: { id: true, questionKey: true },
  });
  const absentIds = activeOfficial
    .filter((row) => !desiredKeys.has(row.questionKey!))
    .map((row) => row.id);
  let nDeactivated = 0;
  for (let i = 0; i < absentIds.length; i += 200) {
    const chunk = absentIds.slice(i, i + 200);
    const res = await prisma.question.updateMany({
      where: { id: { in: chunk } },
      data: { isActive: false, isPublished: false },
    });
    nDeactivated += res.count;
  }

  // sanity: every imported question must have exactly one correct option
  const bad = await prisma.question.count({
    where: { contentVersionId: version.id, options: { none: { isCorrect: true } } },
  });
  console.log(
    `\nupserted ${nQ} official questions in ${sections.length} topics ` +
      `(skipped ${nSkippedDup} within-section identical duplicate${nSkippedDup === 1 ? "" : "s"}; ` +
      `deactivated ${nDeactivated} absent-from-source). ` +
      `questions with no correct option: ${bad}`,
  );
  console.log(
    `explanations: ${nWithExpl} questions got a grounded study-aid ` +
      `(${nReviewed} REVIEWED, ${nWithExpl - nReviewed} UNREVIEWED); ` +
      `${nQ - nWithExpl} kept the official-base reference only.`,
  );
  if (quarantined.size > 0) {
    const heldImported = await prisma.question.count({
      where: { contentVersionId: version.id, isPublished: false },
    });
    console.log(
      `quarantine: ${quarantined.size} flagged key(s) listed → ${heldImported} imported UNPUBLISHED ` +
        `(suspect answer key, awaiting ground-truth resolution).`,
    );
  }
  if (bad > 0) throw new Error("INTEGRITY FAIL: some imported questions have no correct option");
}

// CLI entrypoint: auto-run ONLY when invoked directly (`npx tsx scripts/import-official.ts`),
// NOT when imported (e.g. by prisma/seed.ts, which reuses importOfficial with its own client).
if (process.argv[1]?.endsWith("import-official.ts")) {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
  importOfficial(prisma)
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
