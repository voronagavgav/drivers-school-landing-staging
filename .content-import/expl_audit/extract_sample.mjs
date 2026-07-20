import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';

const db = new DatabaseSync('prisma/dev.db');
const rows = db.prepare(`
  SELECT q.id AS qid, t.title AS topic, q.topicId AS topicId,
         q.text AS question, e.shortText AS short, e.detailedText AS detailed,
         e.legalReference AS legalRef
  FROM QuestionExplanation e
  JOIN Question q ON q.id = e.questionId
  LEFT JOIN Topic t ON t.id = q.topicId
  WHERE e.reviewedStatus='UNREVIEWED' AND q.sourceType='OFFICIAL'
        AND q.isPublished=1 AND q.imageUrl IS NULL
  ORDER BY t.title, q.id
`).all();

const optStmt = db.prepare(`SELECT text, isCorrect FROM QuestionOption WHERE questionId=? ORDER BY displayOrder`);
for (const r of rows) {
  r.options = optStmt.all(r.qid).map(o => ({ text: o.text, correct: !!o.isCorrect }));
}

// Stratified/systematic sample: every Nth across topic-ordered list → spans all topics proportionally.
const TARGET = 120;
const step = rows.length / TARGET;
const sample = [];
for (let i = 0; i < rows.length; i++) {
  if (Math.floor(i / step) > Math.floor((i - 1) / step)) sample.push(rows[i]);
}

// topic coverage report
const byTopic = {};
for (const r of sample) byTopic[r.topic || '(none)'] = (byTopic[r.topic || '(none)'] || 0) + 1;

writeFileSync('.content-import/expl_audit/sample.json', JSON.stringify(sample, null, 2));
console.log(`pool(text-only UNREVIEWED)=${rows.length}  sampled=${sample.length}  topics_in_sample=${Object.keys(byTopic).length}`);
console.log('topic coverage:', JSON.stringify(byTopic));
db.close();
