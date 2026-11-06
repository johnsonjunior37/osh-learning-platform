import { ClipboardCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { getStage, PASS_SCORE, QUESTIONS_PER_STAGE } from '../content'

export function QuizEntryPage() {
  const [params] = useSearchParams()
  const stage = getStage(Number(params.get('stage')))

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">線上測驗</h1>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-center">
        <ClipboardCheck className="mx-auto size-10 text-brand-700" aria-hidden />
        <p className="text-lg font-semibold text-slate-900">測驗功能準備中</p>
        <p className="text-slate-600">
          {stage ? `階段${'一二三四五'[stage.id - 1]}「${stage.title}」` : '每階段'}共 {QUESTIONS_PER_STAGE} 題，
          每題 5 分，{PASS_SCORE} 分以上通過。題庫審核完成後開放。
        </p>
        <Link
          to={stage ? `/learn/${stage.id}` : '/learn'}
          className="mx-auto flex min-h-12 max-w-xs items-center justify-center rounded-xl bg-brand-700 font-semibold text-white"
        >
          先閱讀教材
        </Link>
      </div>
    </div>
  )
}
