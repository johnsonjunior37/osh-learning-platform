// 題庫檢查規則，正式題庫與示範題共用

export const LETTERS = ['A', 'B', 'C', 'D']
export const TYPES = ['concept', 'practice', 'scenario']
// 原始教材中只有標題或空白的頁面，不可作為出題依據
export const NON_CONTENT_PAGES = new Set([1, 2, 3, 38, 43, 48, 51, 57, 62, 63, 86, 112])

function bigrams(text) {
  const s = text.replace(/[\s，。、？！「」（）：；0-9A-Za-z]/g, '')
  const set = new Set()
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
  return set
}

export function similarity(a, b) {
  const x = bigrams(a)
  const y = bigrams(b)
  if (x.size === 0 || y.size === 0) return 0
  let inter = 0
  for (const g of x) if (y.has(g)) inter++
  return inter / (x.size + y.size - inter)
}

/**
 * 檢查已組好選項的題目（options + answer）。
 * @param {Array} questions
 * @param {{ perStage?: number, typeQuota?: Record<string, number>, balanceAnswers?: boolean }} opts
 */
export function validateQuestions(questions, opts = {}) {
  const errors = []
  const warnings = []
  const ids = new Set()
  const byStage = new Map()

  for (const q of questions) {
    const where = q.id ?? '(無 id)'
    if (ids.has(q.id)) errors.push(`${where}: id 重複`)
    ids.add(q.id)
    if (![1, 2, 3, 4, 5].includes(q.stage)) errors.push(`${where}: stage 必須為 1–5`)
    if (!TYPES.includes(q.type)) errors.push(`${where}: type 不正確`)
    if (![1, 2, 3].includes(q.difficulty)) errors.push(`${where}: difficulty 必須為 1–3`)
    if (!q.stem?.trim()) errors.push(`${where}: 缺少題目`)
    if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`${where}: 必須有 4 個選項`)
    else {
      const keys = q.options.map((o) => o.key).join('')
      if (keys !== 'ABCD') errors.push(`${where}: 選項代號必須依序為 A–D`)
      const texts = q.options.map((o) => o.text.trim())
      if (new Set(texts).size !== 4) errors.push(`${where}: 選項文字重複`)
      if (texts.some((t) => !t)) errors.push(`${where}: 有空白選項`)
      if (texts.some((t) => /以上皆是|以上皆非/.test(t))) errors.push(`${where}: 不使用「以上皆是／以上皆非」`)
    }
    if (!LETTERS.includes(q.answer)) errors.push(`${where}: 正確答案必須為 A–D`)
    if (!q.explanation?.trim()) errors.push(`${where}: 缺少解析`)
    if (/選項\s*[ABCD]|答案[為是]\s*[ABCD]|[ABCD]\s*選項/.test(q.explanation ?? ''))
      errors.push(`${where}: 解析不可依賴選項代號，因為選項順序可能調整`)
    if (/同題|上一題|前一題|下一題/.test(q.stem ?? '')) errors.push(`${where}: 題目須獨立成立，不可引用其他題目`)
    if (!Array.isArray(q.pages) || q.pages.length === 0) errors.push(`${where}: 缺少對應頁碼`)
    else
      for (const p of q.pages) {
        if (!Number.isInteger(p) || p < 1 || p > 112) errors.push(`${where}: 頁碼 ${p} 超出範圍`)
        else if (NON_CONTENT_PAGES.has(p)) errors.push(`${where}: 頁碼 ${p} 為標題或空白頁`)
      }
    if (!byStage.has(q.stage)) byStage.set(q.stage, [])
    byStage.get(q.stage).push(q)
  }

  if (opts.perStage) {
    for (let s = 1; s <= 5; s++) {
      const list = byStage.get(s) ?? []
      if (list.length !== opts.perStage) errors.push(`階段${s}: 應有 ${opts.perStage} 題，實際 ${list.length} 題`)
      if (opts.typeQuota) {
        for (const [type, n] of Object.entries(opts.typeQuota)) {
          const count = list.filter((q) => q.type === type).length
          if (count !== n) errors.push(`階段${s}: ${type} 應有 ${n} 題，實際 ${count} 題`)
        }
      }
      if (opts.balanceAnswers) {
        const target = opts.perStage / 4
        for (const L of LETTERS) {
          const count = list.filter((q) => q.answer === L).length
          if (count !== target) errors.push(`階段${s}: 答案 ${L} 應有 ${target} 題，實際 ${count} 題`)
        }
      }
    }
  }

  // 重複題檢查：題幹相似度過高
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const sim = similarity(questions[i].stem, questions[j].stem)
      if (sim >= 0.75) errors.push(`${questions[i].id} 與 ${questions[j].id}: 題幹相似度 ${sim.toFixed(2)}，可能是重複題`)
      else if (sim >= 0.55) warnings.push(`${questions[i].id} 與 ${questions[j].id}: 題幹相似度 ${sim.toFixed(2)}，請人工確認不是換字重複`)
    }
  }

  return { errors, warnings }
}
