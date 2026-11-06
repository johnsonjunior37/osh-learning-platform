import { AlertTriangle, CheckCircle2, FileText, XCircle } from 'lucide-react'
import { useState } from 'react'
import { formatPages } from '../content'
import type { ReviewItem } from '../lib/quiz-types'

export function ReviewList({ items }: { items: ReviewItem[] }) {
  const [onlyWrong, setOnlyWrong] = useState(false)
  const wrongCount = items.filter((i) => !i.isCorrect).length
  const shown = items.map((item, i) => ({ item, no: i + 1 })).filter(({ item }) => !onlyWrong || !item.isCorrect)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200 p-1" role="tablist" aria-label="顯示範圍">
        <button
          type="button"
          role="tab"
          aria-selected={!onlyWrong}
          onClick={() => setOnlyWrong(false)}
          className={`min-h-11 rounded-lg font-semibold ${!onlyWrong ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
        >
          全部題目 {items.length}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={onlyWrong}
          onClick={() => setOnlyWrong(true)}
          className={`min-h-11 rounded-lg font-semibold ${onlyWrong ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
        >
          只看錯題 {wrongCount}
        </button>
      </div>

      {shown.length === 0 && <p className="rounded-xl bg-brand-50 p-4 text-center text-brand-900">全部答對，沒有錯題。</p>}

      <ol className="space-y-4">
        {shown.map(({ item, no }) => (
          <li key={item.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-500">第 {no} 題</span>
              {item.isCorrect ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 className="size-4" aria-hidden />
                  答對
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-sm font-semibold text-rose-800">
                  <XCircle className="size-4" aria-hidden />
                  {item.selected ? '答錯' : '未作答'}
                </span>
              )}
            </div>
            <p className="font-semibold text-slate-900">{item.stem}</p>
            <ul className="space-y-2">
              {item.options.map((opt) => {
                const isAnswer = opt.key === item.answer
                const isSelected = opt.key === item.selected
                const style = isAnswer
                  ? 'border-emerald-500 bg-emerald-50'
                  : isSelected
                    ? 'border-rose-400 bg-rose-50'
                    : 'border-slate-200'
                return (
                  <li key={opt.key} className={`flex items-start gap-2.5 rounded-xl border-2 px-3 py-2.5 ${style}`}>
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                      {opt.key}
                    </span>
                    <span className="flex-1">
                      {opt.text}
                      {(isAnswer || isSelected) && (
                        <span className="mt-0.5 block text-sm font-semibold">
                          {isAnswer && <span className="text-emerald-700">正確答案</span>}
                          {isAnswer && isSelected && <span className="text-slate-400"> · </span>}
                          {isSelected && <span className={isAnswer ? 'text-emerald-700' : 'text-rose-700'}>你的選擇</span>}
                        </span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
            <div className="rounded-xl bg-slate-50 p-3 text-[15px]">
              <p className="font-semibold text-slate-900">解析</p>
              <p className="mt-1 text-slate-700">{item.explanation}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-500">
                <FileText className="size-3.5" aria-hidden />
                教材 {formatPages(item.pages)}
              </p>
              {item.needsVerification && (
                <p className="mt-2 flex gap-1.5 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  本題涉及可能變動的規範，請以現行法規或公告為準。
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
