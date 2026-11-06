// 題庫檢查
// 用法：node scripts/validate-questions.mjs           檢查示範題（CI 會執行）
//       node scripts/validate-questions.mjs --private 另外檢查正式題庫（需有 content-private/）

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateQuestions } from './lib/question-rules.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let failed = false

function report(label, result) {
  for (const w of result.warnings) console.warn(`[${label}] 提醒：${w}`)
  for (const e of result.errors) console.error(`[${label}] 錯誤：${e}`)
  if (result.errors.length) failed = true
  else console.log(`[${label}] 通過`)
}

const demo = JSON.parse(readFileSync(join(root, 'src/content/demo-questions.json'), 'utf8'))
report('示範題', validateQuestions(demo, { perStage: 3 }))

if (process.argv.includes('--private')) {
  const path = join(root, 'content-private/questions.private.json')
  if (!existsSync(path)) {
    console.error('找不到 content-private/questions.private.json，請先執行 node scripts/build-questions.mjs')
    process.exit(1)
  }
  const official = JSON.parse(readFileSync(path, 'utf8'))
  report(
    '正式題庫',
    validateQuestions(official, {
      perStage: 20,
      typeQuota: { concept: 8, practice: 8, scenario: 4 },
      balanceAnswers: true,
    }),
  )
  // 示範題會公開在網站上，不可與正式題目相同或過於相似
  report('示範題與正式題比對', validateQuestions([...official, ...demo]))
}

process.exit(failed ? 1 : 0)
