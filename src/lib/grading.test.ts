import { describe, expect, it } from 'vitest'
import demo from '../content/demo-questions.json'
import { toCsv } from './format'
import { gradeLocally } from './grading'
import type { KeyedQuestion } from './quiz-types'

const meta = { attemptId: 'demo-1', name: '測試', stage: 1, startedAt: '', submittedAt: '' }

function bank(n: number): KeyedQuestion[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `Q${i}`,
    stage: 1,
    stem: `題目 ${i}`,
    options: (['A', 'B', 'C', 'D'] as const).map((key) => ({ key, text: key })),
    answer: 'B',
    explanation: '解析',
    pages: [4],
  }))
}

function answersWith(qs: KeyedQuestion[], correct: number) {
  return Object.fromEntries(qs.map((q, i) => [q.id, i < correct ? q.answer : 'A']))
}

describe('評分規則（與資料庫 submit_attempt 一致）', () => {
  const qs = bank(20)

  it('全對 100 分通過', () => {
    const r = gradeLocally(qs, answersWith(qs, 20), meta)
    expect(r).toMatchObject({ score: 100, correctCount: 20, wrongCount: 0, passed: true })
  })

  it('答對 16 題 80 分通過', () => {
    expect(gradeLocally(qs, answersWith(qs, 16), meta)).toMatchObject({ score: 80, passed: true })
  })

  it('答對 15 題 75 分未通過', () => {
    expect(gradeLocally(qs, answersWith(qs, 15), meta)).toMatchObject({ score: 75, passed: false })
  })

  it('未作答與無效選項算錯', () => {
    const r = gradeLocally(qs, { Q0: 'B', Q1: 'E', Q2: '' }, meta)
    expect(r.correctCount).toBe(1)
    expect(r.review[1].selected).toBeNull()
    expect(r.review[3].selected).toBeNull()
    expect(r.score).toBe(5)
  })

  it('示範題 3 題：答對 2 題 67 分未通過，3 題 100 分', () => {
    const three = bank(3)
    expect(gradeLocally(three, answersWith(three, 2), meta)).toMatchObject({ score: 67, passed: false })
    expect(gradeLocally(three, answersWith(three, 3), meta)).toMatchObject({ score: 100, passed: true })
  })
})

describe('示範題資料', () => {
  it('每階段 3 題，答案都在選項中', () => {
    for (let s = 1; s <= 5; s++) expect(demo.filter((q) => q.stage === s)).toHaveLength(3)
    for (const q of demo) expect(q.options.map((o) => o.key)).toContain(q.answer)
  })
})

describe('CSV 匯出', () => {
  it('含 BOM、正確跳脫，並防止公式注入', () => {
    const csv = toCsv(['姓名', '備註'], [['=HYPERLINK("x")', '含,逗號'], ['王小明', '一般']])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`)
    expect(csv).toContain('"含,逗號"')
    expect(csv).toContain('王小明,一般')
  })
})
