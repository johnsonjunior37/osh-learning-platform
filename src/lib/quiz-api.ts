import demoBank from '../content/demo-questions.json'
import { IS_DEMO, SUPABASE_ANON_KEY, SUPABASE_URL } from './config'
import { gradeLocally } from './grading'
import type { KeyedQuestion, QuizResult, QuizSession } from './quiz-types'

const DEMO_QUESTIONS = demoBank as KeyedQuestion[]

export class ApiError extends Error {}

const SESSION_KEY = 'osh-quiz-session-v1'
const ANSWERS_KEY = 'osh-quiz-answers-v1'
const RESULT_PREFIX = 'osh-quiz-result-v1:'
const TOKEN_PREFIX = 'osh-quiz-token-v1:'

// sessionStorage 在部分瀏覽器情境會拋錯，一律包起來
function store(key: string, value: unknown) {
  try {
    if (value === null) window.sessionStorage.removeItem(key)
    else window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 忽略：只影響重新整理後的復原
  }
}
function load<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

async function callFunction<T>(name: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY ?? '' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError('網路連線失敗，請確認網路後再試一次。')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(data?.error ?? '系統暫時無法處理，請稍後再試。')
  return data as T
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function demoQuestionCount(stage: number): number {
  return DEMO_QUESTIONS.filter((q) => q.stage === stage).length
}

export async function startQuiz(name: string, stage: number): Promise<QuizSession> {
  let session: QuizSession
  if (IS_DEMO) {
    const qs = shuffle(DEMO_QUESTIONS.filter((q) => q.stage === stage))
    session = {
      attemptId: `demo-${crypto.randomUUID()}`,
      token: 'demo',
      name: name.trim(),
      stage,
      startedAt: new Date().toISOString(),
      questions: qs.map(({ id, stem, options }) => ({ id, stem, options })),
      demo: true,
    }
  } else {
    const data = await callFunction<Omit<QuizSession, 'demo'>>('start-attempt', { name, stage, consent: true })
    session = { ...data, demo: false }
  }
  store(SESSION_KEY, session)
  store(ANSWERS_KEY, {})
  store(TOKEN_PREFIX + session.attemptId, session.token)
  return session
}

export function currentSession(): QuizSession | null {
  return load<QuizSession>(SESSION_KEY)
}

export function savedAnswers(): Record<string, string> {
  return load<Record<string, string>>(ANSWERS_KEY) ?? {}
}

export function saveAnswers(answers: Record<string, string>) {
  store(ANSWERS_KEY, answers)
}

export function abandonSession() {
  store(SESSION_KEY, null)
  store(ANSWERS_KEY, null)
}

export async function submitQuiz(session: QuizSession, answers: Record<string, string>): Promise<QuizResult> {
  let result: QuizResult
  if (session.demo) {
    const keyed = session.questions.map((q) => DEMO_QUESTIONS.find((d) => d.id === q.id)!)
    result = {
      ...gradeLocally(keyed, answers, {
        attemptId: session.attemptId,
        name: session.name,
        stage: session.stage,
        startedAt: session.startedAt,
        submittedAt: new Date().toISOString(),
      }),
      demo: true,
    }
  } else {
    result = await callFunction<QuizResult>('submit-attempt', {
      attemptId: session.attemptId,
      token: session.token,
      answers,
    })
  }
  store(RESULT_PREFIX + result.attemptId, result)
  abandonSession()
  return result
}

/** 取得已提交測驗的成績與解析：先看本機暫存，再向伺服端以 token 取回 */
export async function loadResult(attemptId: string): Promise<QuizResult> {
  const cached = load<QuizResult>(RESULT_PREFIX + attemptId)
  if (cached) return cached
  const token = load<string>(TOKEN_PREFIX + attemptId)
  if (!token || attemptId.startsWith('demo-') || IS_DEMO) {
    throw new ApiError('找不到這次測驗的成績，可能已關閉瀏覽器分頁。請重新測驗。')
  }
  const result = await callFunction<QuizResult>('get-review', { attemptId, token })
  store(RESULT_PREFIX + attemptId, result)
  return result
}
