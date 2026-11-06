import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ReviewList } from '../components/ReviewList'
import { useResult } from './ResultPage'

const STAGE_NAMES = '一二三四五'

export function ReviewPage() {
  const { attemptId } = useParams()
  const { result, error } = useResult(attemptId)

  if (error) return <p className="rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p>
  if (!result) return <p className="py-10 text-center text-slate-500">載入解析中…</p>

  return (
    <div className="space-y-4">
      <Link to={`/result/${result.attemptId}`} className="inline-flex min-h-11 items-center gap-1 text-[15px] text-brand-700">
        <ArrowLeft className="size-4" aria-hidden />
        回到成績
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-slate-900">答案解析</h1>
        <p className="mt-1 text-slate-600">
          {result.name} · 階段{STAGE_NAMES[result.stage - 1]} · {result.score} 分
        </p>
      </header>
      <ReviewList items={result.review} />
    </div>
  )
}
