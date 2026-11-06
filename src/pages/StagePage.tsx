import { ArrowLeft, ArrowRight, BookMarked, CheckCircle2, ClipboardCheck, FileText, Lightbulb, ListChecks, Target } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { BlockView, SourceList } from '../components/Blocks'
import { formatPages, getStage, QUESTIONS_PER_STAGE, STAGES } from '../content'
import type { CaseStudy } from '../content/types'
import { useReadingProgress } from '../lib/progress'

const STAGE_NAMES = '一二三四五'

function PageTag({ pages }: { pages: number[] }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      <FileText className="size-3" aria-hidden />
      {formatPages(pages)}
    </span>
  )
}

function Part({ id, icon, title, children }: { id: string; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section id={id} className="space-y-3">
      <h2 className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xl font-bold text-slate-900">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}

function CaseCard({ c }: { c: CaseStudy }) {
  return (
    <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            c.kind === 'real' ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'
          }`}
        >
          {c.kind === 'real' ? '真實案例' : '教材範例'}
        </span>
        <PageTag pages={c.pages} />
      </div>
      <h3 className="text-lg leading-snug font-bold text-slate-900">{c.title}</h3>
      <div className="space-y-1">
        {c.facts.map((f) => (
          <p key={f}>{f}</p>
        ))}
      </div>
      {c.analysis.map((a) => (
        <div key={a.label}>
          <p className="font-semibold text-slate-900">{a.label}</p>
          <ul className="list-disc space-y-0.5 pl-6 text-[15px] marker:text-slate-400">
            {a.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      ))}
      <p className="rounded-xl bg-brand-50 p-3 text-[15px] text-brand-900">
        <span className="font-semibold">學習重點：</span>
        {c.lesson}
      </p>
      {c.source && (
        <div className="text-sm text-slate-500">
          資料來源
          <SourceList sources={[c.source]} />
        </div>
      )}
    </article>
  )
}

export function StagePage() {
  const { stageId } = useParams()
  const stage = getStage(Number(stageId))
  const { isDone, toggle } = useReadingProgress()

  if (!stage) return <Navigate to="/learn" replace />

  const prev = STAGES.find((s) => s.id === stage.id - 1)
  const next = STAGES.find((s) => s.id === stage.id + 1)
  const allPages = stage.sections.flatMap((s) => s.pages)
  const read = isDone(stage.id)

  const toc = [
    { id: 'objectives', label: '學習目標' },
    { id: 'concepts', label: '核心觀念' },
    { id: 'terms', label: '重要名詞' },
    { id: 'cases', label: '工作案例' },
    { id: 'summary', label: '重點整理' },
    { id: 'pages', label: '對應頁碼' },
  ]

  return (
    <article className="prose-zh space-y-8">
      <header className="space-y-3">
        <Link to="/learn" className="inline-flex min-h-11 items-center gap-1 text-[15px] text-brand-700">
          <ArrowLeft className="size-4" aria-hidden />
          教材總覽
        </Link>
        <p className="text-sm font-semibold text-brand-700">階段{STAGE_NAMES[stage.id - 1]}</p>
        <h1 className="text-2xl leading-snug font-bold text-slate-900">{stage.title}</h1>
        <p className="text-slate-600">{stage.intro}</p>
        <nav aria-label="本頁目錄" className="flex flex-wrap gap-2">
          {toc.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-3.5 text-sm text-slate-700"
            >
              {t.label}
            </a>
          ))}
        </nav>
      </header>

      <Part id="objectives" icon={<Target className="size-5 text-brand-700" aria-hidden />} title="學習目標">
        <ul className="space-y-2">
          {stage.objectives.map((o) => (
            <li key={o} className="flex gap-2">
              <CheckCircle2 className="mt-1 size-5 shrink-0 text-brand-600" aria-hidden />
              <span>{o}</span>
            </li>
          ))}
        </ul>
      </Part>

      <Part id="concepts" icon={<Lightbulb className="size-5 text-brand-700" aria-hidden />} title="核心觀念">
        <div className="space-y-6">
          {stage.sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{section.title}</h3>
                <PageTag pages={section.pages} />
              </div>
              {section.blocks.map((block, i) => (
                <BlockView key={i} block={block} />
              ))}
            </section>
          ))}
        </div>
      </Part>

      <Part id="terms" icon={<BookMarked className="size-5 text-brand-700" aria-hidden />} title="重要名詞">
        <dl className="space-y-2">
          {stage.terms.map((t) => (
            <div key={t.term} className="rounded-xl border border-slate-200 bg-white p-3">
              <dt className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                {t.term}
                <PageTag pages={t.pages} />
              </dt>
              <dd className="mt-1 text-[15px]">{t.definition}</dd>
            </div>
          ))}
        </dl>
      </Part>

      <Part id="cases" icon={<FileText className="size-5 text-brand-700" aria-hidden />} title="實際工作案例">
        <div className="space-y-4">
          {stage.cases.map((c) => (
            <CaseCard key={c.title} c={c} />
          ))}
        </div>
      </Part>

      <Part id="summary" icon={<ListChecks className="size-5 text-brand-700" aria-hidden />} title="重點整理">
        <ol className="space-y-2">
          {stage.keyPoints.map((k, i) => (
            <li key={k} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
                {i + 1}
              </span>
              <span>{k}</span>
            </li>
          ))}
        </ol>
      </Part>

      <Part id="pages" icon={<FileText className="size-5 text-brand-700" aria-hidden />} title="原始教材對應頁碼">
        <p>
          本階段整理自原始教材 <strong>{formatPages(allPages)}</strong>。
        </p>
        <ul className="space-y-1 text-[15px]">
          {stage.sections.map((s) => (
            <li key={s.title} className="flex justify-between gap-3 border-b border-slate-100 py-1.5">
              <span>{s.title}</span>
              <span className="shrink-0 text-slate-500">{formatPages(s.pages)}</span>
            </li>
          ))}
        </ul>
      </Part>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            checked={read}
            onChange={(e) => toggle(stage.id, e.target.checked)}
            className="size-5 accent-brand-700"
          />
          <span className="font-medium">我已讀完本階段</span>
        </label>
        <Link
          to={`/quiz?stage=${stage.id}`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 font-semibold text-white"
        >
          <ClipboardCheck className="size-5" aria-hidden />
          前往階段{STAGE_NAMES[stage.id - 1]}測驗 · {QUESTIONS_PER_STAGE} 題
        </Link>
      </section>

      <nav className="grid grid-cols-2 gap-2" aria-label="其他階段">
        {prev ? (
          <Link
            to={`/learn/${prev.id}`}
            className="flex min-h-12 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-[15px]"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            <span className="truncate">階段{STAGE_NAMES[prev.id - 1]}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to={`/learn/${next.id}`}
            className="flex min-h-12 items-center justify-end gap-1 rounded-xl border border-slate-300 bg-white px-3 text-[15px]"
          >
            <span className="truncate">階段{STAGE_NAMES[next.id - 1]}</span>
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  )
}
