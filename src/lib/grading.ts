import type { KeyedQuestion, OptionKey, QuizResult } from './quiz-types'

export const PASS_SCORE = 80

const VALID: OptionKey[] = ['A', 'B', 'C', 'D']

/**
 * 示範模式的本機評分，規則與資料庫 submit_attempt 相同：
 * 分數 = 答對題數 / 總題數 × 100 四捨五入；80 分以上通過；未作答或無效選項算錯。
 */
export function gradeLocally(
  questions: KeyedQuestion[],
  answers: Record<string, string>,
  meta: { attemptId: string; name: string; stage: number; startedAt: string; submittedAt: string },
): QuizResult {
  const review = questions.map((q) => {
    const raw = answers[q.id]
    const selected = VALID.includes(raw as OptionKey) ? (raw as OptionKey) : null
    return {
      id: q.id,
      stem: q.stem,
      options: q.options,
      selected,
      answer: q.answer,
      isCorrect: selected === q.answer,
      explanation: q.explanation,
      pages: q.pages,
      needsVerification: Boolean(q.needsVerification),
    }
  })
  const total = review.length
  const correctCount = review.filter((r) => r.isCorrect).length
  const score = total === 0 ? 0 : Math.round((100 * correctCount) / total)
  return {
    ...meta,
    score,
    correctCount,
    wrongCount: total - correctCount,
    total,
    passed: score >= PASS_SCORE,
    review,
  }
}
