import { BookOpen, CheckCircle2, ClipboardCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PASS_SCORE, QUESTIONS_PER_STAGE, STAGES, TOTAL_QUESTIONS } from '../content'
import { useReadingProgress } from '../lib/progress'

export function HomePage() {
  const { isDone, done } = useReadingProgress()

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-brand-800 p-5 text-white">
        <h1 className="text-2xl leading-snug font-bold text-balance">職業安全衛生學習與測驗平台</h1>
        <p className="mt-2 text-brand-50">
          依一般安全衛生教育訓練教材整理為五個階段。先讀教材，再完成每階段 {QUESTIONS_PER_STAGE} 題測驗。
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/10 px-2 py-2">
            <dt className="text-xs text-brand-100">學習階段</dt>
            <dd className="text-xl font-bold">{STAGES.length}</dd>
          </div>
          <div className="rounded-xl bg-white/10 px-2 py-2">
            <dt className="text-xs text-brand-100">總題數</dt>
            <dd className="text-xl font-bold">{TOTAL_QUESTIONS}</dd>
          </div>
          <div className="rounded-xl bg-white/10 px-2 py-2">
            <dt className="text-xs text-brand-100">通過標準</dt>
            <dd className="text-xl font-bold">{PASS_SCORE} 分</dd>
          </div>
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            to="/learn"
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-white font-semibold text-brand-800"
          >
            <BookOpen className="size-5" aria-hidden />
            開始學習
          </Link>
          <Link
            to="/quiz"
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-white/60 font-semibold text-white"
          >
            <ClipboardCheck className="size-5" aria-hidden />
            開始測驗
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-slate-900">五階段課程</h2>
          <p className="text-sm text-slate-500">
            已讀 {done.length} / {STAGES.length}
          </p>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden>
          <div className="h-full bg-brand-600" style={{ width: `${(done.length / STAGES.length) * 100}%` }} />
        </div>
        <ul className="mt-3 space-y-3">
          {STAGES.map((stage) => (
            <li key={stage.id}>
              <Link
                to={`/learn/${stage.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-brand-700">階段{'一二三四五'[stage.id - 1]}</p>
                  {isDone(stage.id) && (
                    <span className="inline-flex items-center gap-1 text-sm text-brand-700">
                      <CheckCircle2 className="size-4" aria-hidden />
                      已讀
                    </span>
                  )}
                </div>
                <h3 className="mt-0.5 text-lg leading-snug font-bold text-slate-900">{stage.title}</h3>
                <p className="mt-1 text-[15px] text-slate-600">{stage.topics.join('、')}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {QUESTIONS_PER_STAGE} 題 · 教材 {stage.pageRange}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
