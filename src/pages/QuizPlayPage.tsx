import { ChevronLeft, ChevronRight, Grid3x3, Send, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { currentSession, saveAnswers, savedAnswers, submitQuiz } from '../lib/quiz-api'
import type { OptionKey } from '../lib/quiz-types'

const STAGE_NAMES = '一二三四五'

export function QuizPlayPage() {
  const navigate = useNavigate()
  const session = useMemo(() => currentSession(), [])
  const [answers, setAnswers] = useState<Record<string, string>>(() => savedAnswers())
  const [index, setIndex] = useState(() => {
    const s = currentSession()
    const a = savedAnswers()
    const firstOpen = s?.questions.findIndex((q) => !a[q.id]) ?? 0
    return firstOpen < 0 ? 0 : firstOpen
  })
  const [showGrid, setShowGrid] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [index])

  if (!session) return <Navigate to="/quiz" replace />

  const total = session.questions.length
  const q = session.questions[index]
  const answeredCount = session.questions.filter((x) => answers[x.id]).length
  const unanswered = session.questions.map((x, i) => (answers[x.id] ? null : i + 1)).filter((n): n is number => n !== null)

  const choose = (key: OptionKey) => {
    const next = { ...answers, [q.id]: key }
    setAnswers(next)
    saveAnswers(next)
  }

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await submitQuiz(session, answers)
      navigate(`/result/${result.attemptId}`, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失敗，請再試一次。')
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-semibold text-brand-700">
            階段{STAGE_NAMES[session.stage - 1]}
            {session.demo && ' · 示範題'}
          </span>
          <span className="truncate text-slate-600">{session.name}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            第 <strong className="text-slate-900">{index + 1}</strong> / {total} 題
          </span>
          <span>
            已作答 {answeredCount} / {total}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={answeredCount}
          aria-label="作答進度"
        >
          <div className="h-full bg-brand-600 transition-all" style={{ width: `${(answeredCount / total) * 100}%` }} />
        </div>
        <button
          type="button"
          onClick={() => setShowGrid((v) => !v)}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg text-[15px] font-medium text-brand-700"
          aria-expanded={showGrid}
        >
          <Grid3x3 className="size-4" aria-hidden />
          {showGrid ? '收起題號' : '查看全部題號'}
        </button>
        {showGrid && (
          <div className="grid grid-cols-5 gap-2 pt-1">
            {session.questions.map((x, i) => {
              const done = Boolean(answers[x.id])
              const current = i === index
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => {
                    setIndex(i)
                    setShowGrid(false)
                  }}
                  aria-label={`第 ${i + 1} 題，${done ? '已作答' : '未作答'}`}
                  className={`min-h-11 rounded-lg border text-[15px] font-semibold ${
                    current ? 'ring-2 ring-brand-700 ring-offset-1' : ''
                  } ${done ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
                >
                  {i + 1}
                </button>
              )
            })}
            <p className="col-span-5 flex items-center gap-4 pt-1 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded bg-brand-600" aria-hidden />
                已作答
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded border border-slate-400 bg-white" aria-hidden />
                未作答
              </span>
            </p>
          </div>
        )}
      </div>

      <section aria-labelledby="stem" className="space-y-3">
        <h1 id="stem" className="text-lg leading-relaxed font-semibold text-slate-900">
          {index + 1}. {q.stem}
        </h1>
        <div role="radiogroup" aria-labelledby="stem" className="space-y-2.5">
          {q.options.map((opt) => {
            const selected = answers[q.id] === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(opt.key)}
                className={`flex min-h-14 w-full items-start gap-3 rounded-xl border-2 px-4 py-3 text-left ${
                  selected ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white active:bg-slate-50'
                }`}
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    selected ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {opt.key}
                </span>
                <span className="pt-0.5">{opt.text}</span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto grid max-w-3xl grid-cols-[1fr_1fr] gap-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="flex min-h-12 items-center justify-center gap-1 rounded-xl border border-slate-300 font-semibold text-slate-700 disabled:opacity-40"
          >
            <ChevronLeft className="size-5" aria-hidden />
            上一題
          </button>
          {index < total - 1 ? (
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
              className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-brand-700 font-semibold text-white"
            >
              下一題
              <ChevronRight className="size-5" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-amber-500 font-semibold text-slate-900"
            >
              <Send className="size-5" aria-hidden />
              提交測驗
            </button>
          )}
        </div>
        {index < total - 1 && answeredCount === total && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mx-auto mt-2 flex min-h-11 w-full max-w-3xl items-center justify-center gap-1.5 rounded-xl bg-amber-500 font-semibold text-slate-900"
          >
            <Send className="size-5" aria-hidden />
            全部作答完成，提交測驗
          </button>
        )}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/50 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="w-full max-w-md space-y-4 rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl">
            <div className="flex items-start justify-between gap-2">
              <h2 id="confirm-title" className="text-lg font-bold text-slate-900">
                確定要提交嗎？
              </h2>
              <button type="button" onClick={() => setConfirming(false)} className="-m-2 p-2 text-slate-500" aria-label="關閉">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            {unanswered.length > 0 ? (
              <div className="rounded-xl bg-amber-50 p-3 text-amber-950">
                <p className="font-semibold">還有 {unanswered.length} 題未作答，未作答視為答錯。</p>
                <p className="mt-1 text-[15px]">未作答題號：{unanswered.join('、')}</p>
              </div>
            ) : (
              <p className="text-slate-700">{total} 題都已作答。提交後就不能再修改答案。</p>
            )}
            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 p-3 text-rose-800">
                {error}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {unanswered.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setIndex(unanswered[0] - 1)
                    setConfirming(false)
                  }}
                  className="min-h-12 rounded-xl border border-slate-300 font-semibold text-slate-700"
                >
                  回去作答
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="min-h-12 rounded-xl border border-slate-300 font-semibold text-slate-700"
                >
                  再檢查一下
                </button>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="min-h-12 rounded-xl bg-brand-700 font-semibold text-white disabled:opacity-60"
              >
                {busy ? '評分中…' : '確定提交'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
