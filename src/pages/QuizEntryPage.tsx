import { ClipboardCheck, Lock, PlayCircle } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PASS_SCORE, QUESTIONS_PER_STAGE, STAGES } from '../content'
import { IS_DEMO } from '../lib/config'
import { abandonSession, currentSession, demoQuestionCount, startQuiz } from '../lib/quiz-api'

const STAGE_NAMES = '一二三四五'

export function QuizEntryPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initialStage = Number(params.get('stage'))
  const [name, setName] = useState('')
  const [stage, setStage] = useState<number | null>(initialStage >= 1 && initialStage <= 5 ? initialStage : null)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resume, setResume] = useState(() => currentSession())

  const trimmed = name.trim()
  const nameError = trimmed.length > 30 ? '姓名最多 30 個字。' : ''

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!trimmed) return setError('請輸入姓名。')
    if (nameError) return setError(nameError)
    if (!stage) return setError('請選擇測驗階段。')
    if (!consent) return setError('請先閱讀並同意個人資料告知事項。')
    setBusy(true)
    try {
      await startQuiz(trimmed, stage)
      navigate('/quiz/play')
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法開始測驗，請稍後再試。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">線上測驗</h1>
        <p className="mt-1 text-slate-600">
          {IS_DEMO
            ? '目前為示範模式，每階段提供 3 題示範題，成績不會儲存。'
            : `每階段 ${QUESTIONS_PER_STAGE} 題單選題，每題 5 分，${PASS_SCORE} 分以上通過。`}
        </p>
      </header>

      {resume && (
        <section className="space-y-3 rounded-2xl border border-brand-600 bg-brand-50 p-4">
          <p className="font-semibold text-brand-900">
            你有一份尚未提交的測驗：{resume.name}・階段{STAGE_NAMES[resume.stage - 1]}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/quiz/play"
              className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-brand-700 font-semibold text-white"
            >
              <PlayCircle className="size-5" aria-hidden />
              繼續作答
            </Link>
            <button
              type="button"
              onClick={() => {
                abandonSession()
                setResume(null)
              }}
              className="min-h-12 rounded-xl border border-slate-300 bg-white font-semibold text-slate-700"
            >
              放棄並重新開始
            </button>
          </div>
        </section>
      )}

      <form onSubmit={submit} className="space-y-5" noValidate>
        <div className="space-y-2">
          <label htmlFor="name" className="block font-semibold text-slate-900">
            學員姓名
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={40}
            required
            className="block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[17px] focus:border-brand-600"
            placeholder="請輸入真實姓名"
            aria-invalid={Boolean(nameError)}
          />
          {nameError && <p className="text-sm text-rose-700">{nameError}</p>}
        </div>

        <fieldset className="space-y-2">
          <legend className="font-semibold text-slate-900">測驗階段</legend>
          {STAGES.map((s) => (
            <label
              key={s.id}
              className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-white px-4 py-2 ${
                stage === s.id ? 'border-brand-600 ring-2 ring-brand-600/30' : 'border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="stage"
                value={s.id}
                checked={stage === s.id}
                onChange={() => setStage(s.id)}
                className="size-5 shrink-0 accent-brand-700"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-brand-700">
                  階段{STAGE_NAMES[s.id - 1]} · {IS_DEMO ? demoQuestionCount(s.id) : QUESTIONS_PER_STAGE} 題
                </span>
                <span className="block leading-snug">{s.title}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-[15px]">
          <h2 className="flex items-center gap-1.5 font-semibold text-slate-900">
            <Lock className="size-4" aria-hidden />
            個人資料告知
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-slate-700">
            <li>蒐集項目：姓名、測驗階段、作答內容、分數與測驗時間。</li>
            <li>使用目的：記錄職業安全衛生教育訓練的學習成果。</li>
            <li>保存方式：存放於本平台的雲端資料庫，傳輸全程加密。</li>
            <li>可查看者：僅本平台管理者可查看姓名、成績與作答紀錄，其他學員無法查看。</li>
            <li>如需查詢或刪除你的資料，請洽本平台管理者。</li>
          </ul>
          <label className="flex min-h-11 items-center gap-3 pt-1">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="size-5 shrink-0 accent-brand-700"
            />
            <span className="font-medium">我已閱讀並同意上述說明</span>
          </label>
        </section>

        {error && (
          <p role="alert" className="rounded-xl bg-rose-50 p-3 text-rose-800">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 text-lg font-semibold text-white disabled:opacity-60"
        >
          <ClipboardCheck className="size-5" aria-hidden />
          {busy ? '準備題目中…' : '開始測驗'}
        </button>
      </form>
    </div>
  )
}
