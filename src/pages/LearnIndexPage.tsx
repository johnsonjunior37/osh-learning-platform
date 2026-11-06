import { CheckCircle2, ChevronRight, Circle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SOURCE_DOCUMENT, STAGES } from '../content'
import { useReadingProgress } from '../lib/progress'

export function LearnIndexPage() {
  const { isDone } = useReadingProgress()

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">學習教材</h1>
        <p className="mt-1 text-slate-600">
          內容整理自「{SOURCE_DOCUMENT.title}」共 {SOURCE_DOCUMENT.pages} 頁，每段標示原始教材頁碼。
        </p>
      </header>

      <ol className="space-y-3">
        {STAGES.map((stage) => (
          <li key={stage.id}>
            <Link
              to={`/learn/${stage.id}`}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50"
            >
              {isDone(stage.id) ? (
                <CheckCircle2 className="size-6 shrink-0 text-brand-600" aria-label="已讀" />
              ) : (
                <Circle className="size-6 shrink-0 text-slate-300" aria-label="未讀" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-700">階段{'一二三四五'[stage.id - 1]}</p>
                <p className="leading-snug font-bold text-slate-900">{stage.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{stage.intro}</p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>

      <p className="rounded-xl bg-slate-100 p-3 text-[15px] text-slate-600">
        閱讀進度只記錄在這台裝置的瀏覽器，不會上傳。
      </p>
    </div>
  )
}
