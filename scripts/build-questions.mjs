// 由題庫原稿產生正式題庫、Supabase seed SQL
// 用法：node scripts/build-questions.mjs
// 輸入：content-private/questions.source.private.json（正確答案寫在 correct，錯誤選項寫在 wrong）
// 輸出：content-private/questions.private.json、content-private/seed.private.sql
// content-private/ 已列入 .gitignore，含正式答案的檔案不會被提交

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LETTERS, validateQuestions } from './lib/question-rules.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcPath = join(root, 'content-private/questions.source.private.json')
const outPath = join(root, 'content-private/questions.private.json')
const sqlPath = join(root, 'content-private/seed.private.sql')

// 每階段 20 題的正確答案位置，A、B、C、D 各 5 題，避免答案集中
const ANSWER_PATTERN = 'ACBDBDACCADBDBCAADBC'.split('')

const source = JSON.parse(readFileSync(srcPath, 'utf8'))
const counters = new Map()

const questions = source.map((q) => {
  const index = counters.get(q.stage) ?? 0
  counters.set(q.stage, index + 1)
  const answer = ANSWER_PATTERN[index % ANSWER_PATTERN.length]
  const answerPos = LETTERS.indexOf(answer)
  const wrong = [...q.wrong]
  const texts = LETTERS.map((_, i) => (i === answerPos ? q.correct : wrong.shift()))
  return {
    id: q.id,
    stage: q.stage,
    type: q.type,
    difficulty: q.difficulty,
    stem: q.stem,
    options: LETTERS.map((key, i) => ({ key, text: texts[i] })),
    answer,
    explanation: q.explanation,
    pages: q.pages,
    needsVerification: Boolean(q.verify),
    source: q.source ?? null,
  }
})

const { errors, warnings } = validateQuestions(questions, {
  perStage: 20,
  typeQuota: { concept: 8, practice: 8, scenario: 4 },
  balanceAnswers: true,
})
for (const w of warnings) console.warn('提醒：', w)
if (errors.length) {
  for (const e of errors) console.error('錯誤：', e)
  process.exit(1)
}

writeFileSync(outPath, JSON.stringify(questions, null, 2) + '\n')

const lit = (s) => `'${String(s).replaceAll("'", "''")}'`
const rows = questions.map(
  (q) =>
    `(${lit(q.id)}, ${q.stage}, ${lit(q.type)}, ${q.difficulty}, ${lit(q.stem)}, ${lit(JSON.stringify(q.options))}::jsonb, ` +
    `array[${q.pages.join(',')}]::int[], true)`,
)
const keyRows = questions.map(
  (q) =>
    `(${lit(q.id)}, ${lit(q.answer)}, ${lit(q.explanation)}, ${q.needsVerification}, 'draft')`,
)

const sql = `-- 正式題庫 seed，含答案，請勿提交到 Git
-- 產生時間：${new Date().toISOString()}
-- 題目預設 review_status = 'draft'，審核通過後執行：
--   update public.question_keys set review_status = 'approved' where question_id in (...);
begin;

insert into public.questions (id, stage, type, difficulty, stem, options, source_pages, is_active) values
${rows.join(',\n')}
on conflict (id) do update set
  stage = excluded.stage, type = excluded.type, difficulty = excluded.difficulty,
  stem = excluded.stem, options = excluded.options, source_pages = excluded.source_pages,
  is_active = excluded.is_active;

insert into public.question_keys (question_id, answer, explanation, needs_verification, review_status) values
${keyRows.join(',\n')}
on conflict (question_id) do update set
  answer = excluded.answer, explanation = excluded.explanation,
  needs_verification = excluded.needs_verification;

commit;
`
writeFileSync(sqlPath, sql)

console.log(`完成：${questions.length} 題`)
for (let s = 1; s <= 5; s++) {
  const list = questions.filter((q) => q.stage === s)
  const dist = LETTERS.map((L) => `${L}${list.filter((q) => q.answer === L).length}`).join(' ')
  console.log(`階段${s}：${list.length} 題，答案分布 ${dist}`)
}
