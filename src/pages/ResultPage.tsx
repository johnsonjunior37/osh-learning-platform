import { BookOpen, CheckCircle2, ListChecks, RotateCcw, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getStage } from '../content'
import { formatDateTime } from '../lib/format'
import { loadResult } from '../lib/quiz-api'
import type { QuizResult } from '../lib/quiz-types'

const STAGE_NAMES = '一二三四五'

export function useResult(attemptId: string | undefined) {
  const [result, setResult] = useState<QuizResult | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!attemptId) return
    loadResult(attemptId)
      .then(setResult)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '無法取得成績。'))
  }, [attemptId])
  return { result, error }
}

export function ResultPage() {
  const { attemptId } = useParams()
  const { result, error } = useResult(attemptId)

  if (error)
    return (
      <div className="space-y-3 text-center">
        <p className="rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p>
        <Link to="/quiz" className="text-brand-700 underline">
          回測驗頁
        </Link>
      </div>
    )
  if (!result) return <p className="py-10 text-center text-slate-500">載入成績中…</p>

  const stage = getStage(result.stage)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">測驗結果</h1>

      {result.demo && (
        <p className="rounded-xl bg-amber-100 p-3 text-amber-900">示範模式：這次成績沒有儲存。</p>
      )}

      <section
        className={`rounded-2xl p-5 text-center ${result.passed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}
      >
        {result.passed ? (
          <CheckCircle2 className="mx-auto size-10" aria-hidden />
        ) : (
          <XCircle className="mx-auto size-10" aria-hidden />
        )}
        <p className="mt-1 text-xl font-bold">{result.passed ? '通過' : '未通過'}</p>
        <p className="mt-1 text-5xl font-bold tabular-nums">
          {result.score}
          <span className="ml-1 text-xl font-semibold">分</span>
        </p>
        <p className="mt-1 text-white/90">通過標準 80 分</p>
      </section>

      <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {[
          ['學員姓名', result.name],
          ['測驗階段', `階段${STAGE_NAMES[result.stage - 1]} ${stage?.shortTitle ?? ''}`],
          ['測驗日期', formatDateTime(result.submittedAt)],
          ['答對題數', `${result.correctCount} 題`],
          ['答錯題數', `${result.wrongCount} 題`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-3">
            <dt className="shrink-0 text-slate-500">{k}</dt>
            <dd className="text-right font-medium text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-2">
        <Link
          to={`/review/${result.attemptId}`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 font-semibold text-white"
        >
          <ListChecks className="size-5" aria-hidden />
          查看答案解析
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <Link
            to={`/quiz?stage=${result.stage}`}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
          >
            <RotateCcw className="size-5" aria-hidden />
            重新測驗
          </Link>
          <Link
            to={`/learn/${result.stage}`}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
          >
            <BookOpen className="size-5" aria-hidden />
            複習教材
          </Link>
        </div>
      </div>
    </div>
  )
}
