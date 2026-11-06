import { ArrowLeft, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ReviewList } from '../components/ReviewList'
import { getStage } from '../content'
import { formatDateTime } from '../lib/format'
import type { QuizResult } from '../lib/quiz-types'
import { getSupabase } from '../lib/supabase'
import { useAdmin } from './useAdmin'

const STAGE_NAMES = '一二三四五'

export function AdminAttemptPage() {
  const state = useAdmin()
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState<QuizResult | null>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const isAdmin = state.status === 'admin'
  useEffect(() => {
    if (!isAdmin || !attemptId) return
    const sb = getSupabase()!
    sb.rpc('admin_attempt_detail', { p_attempt_id: attemptId }).then(({ data, error: err }) => {
      if (err || !data) setError('找不到這筆測驗紀錄。')
      else setResult(data as QuizResult)
    })
    sb.from('admin_attempts_view')
      .select('participant_id')
      .eq('attempt_id', attemptId)
      .maybeSingle()
      .then(({ data }) => setParticipantId((data as { participant_id: string } | null)?.participant_id ?? null))
  }, [isAdmin, attemptId])

  if (state.status === 'loading') return <p className="py-10 text-center text-slate-500">載入中…</p>
  if (state.status !== 'admin') return <Navigate to="/admin/login" replace />

  const remove = async () => {
    if (!participantId) return
    if (!window.confirm('確定要刪除這筆測驗紀錄與學員姓名嗎？刪除後無法復原。')) return
    const { error: err } = await getSupabase()!.from('participants').delete().eq('id', participantId)
    if (err) setError('刪除失敗。')
    else navigate('/admin', { replace: true })
  }

  return (
    <div className="space-y-4">
      <Link to="/admin" className="inline-flex min-h-11 items-center gap-1 text-[15px] text-brand-700">
        <ArrowLeft className="size-4" aria-hidden />
        回成績列表
      </Link>
      {error && <p className="rounded-xl bg-rose-50 p-3 text-rose-800">{error}</p>}
      {result && (
        <>
          <header className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900">{result.name}</h1>
            <p className="text-slate-600">
              階段{STAGE_NAMES[result.stage - 1]} {getStage(result.stage)?.shortTitle}
            </p>
          </header>
          <dl className="grid grid-cols-2 gap-2 text-[15px]">
            {[
              ['分數', `${result.score} 分`],
              ['結果', result.passed ? '通過' : '未通過'],
              ['答對／答錯', `${result.correctCount}／${result.wrongCount}`],
              ['提交時間', formatDateTime(result.submittedAt)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-200 bg-white p-3">
                <dt className="text-sm text-slate-500">{k}</dt>
                <dd className="font-semibold text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
          <ReviewList items={result.review} />
          <button
            type="button"
            onClick={remove}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white font-semibold text-rose-700"
          >
            <Trash2 className="size-5" aria-hidden />
            刪除這筆測驗紀錄
          </button>
        </>
      )}
    </div>
  )
}
