export type OptionKey = 'A' | 'B' | 'C' | 'D'

export interface QuizOption {
  key: OptionKey
  text: string
}

/** 作答時看到的題目：不含答案 */
export interface PublicQuestion {
  id: string
  stem: string
  options: QuizOption[]
}

export interface QuizSession {
  attemptId: string
  token: string
  name: string
  stage: number
  startedAt: string
  questions: PublicQuestion[]
  demo: boolean
}

export interface ReviewItem extends PublicQuestion {
  selected: OptionKey | null
  answer: OptionKey
  isCorrect: boolean
  explanation: string
  pages: number[]
  needsVerification: boolean
}

export interface QuizResult {
  attemptId: string
  name: string
  stage: number
  startedAt: string
  submittedAt: string
  score: number
  correctCount: number
  wrongCount: number
  total: number
  passed: boolean
  review: ReviewItem[]
  demo?: boolean
}

/** 含答案的題目，只用於示範模式 */
export interface KeyedQuestion extends PublicQuestion {
  stage: number
  answer: OptionKey
  explanation: string
  pages: number[]
  needsVerification?: boolean
}
