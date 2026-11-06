import { AlertTriangle, ExternalLink, Info } from 'lucide-react'
import type { Block, SourceRef } from '../content/types'

export function SourceList({ sources }: { sources: SourceRef[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {sources.map((s) => (
        <li key={s.url} className="text-sm">
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-start gap-1 text-brand-700 underline underline-offset-2"
          >
            <span className="break-all [overflow-wrap:anywhere]">{s.label}</span>
            <ExternalLink className="mt-1 size-3.5 shrink-0" aria-hidden />
          </a>
          <span className="block text-slate-500">查證日期 {s.checked}</span>
        </li>
      ))}
    </ul>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <>
      {/* 手機：一列一張卡片 */}
      <div className="space-y-2 sm:hidden">
        {rows.map((row, i) => (
          <dl key={i} className="rounded-xl border border-slate-200 bg-white p-3">
            {row.map((cell, j) =>
              j === 0 ? (
                <dt key={j} className="font-semibold text-slate-900">
                  {cell}
                </dt>
              ) : (
                <dd key={j} className="mt-1">
                  {headers.length > 2 && <span className="mr-1 text-sm text-slate-500">{headers[j]}：</span>}
                  {cell}
                </dd>
              ),
            )}
          </dl>
        ))}
      </div>
      {/* 平板以上：表格 */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white sm:block">
        <table className="w-full text-left text-[15px]">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              {headers.map((h) => (
                <th key={h} className="px-3 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-slate-200 align-top">
                {row.map((cell, j) => (
                  <td key={j} className={`px-3 py-2 ${j === 0 ? 'font-medium text-slate-900' : ''}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return <p>{block.text}</p>
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag className={`space-y-1 pl-6 ${block.ordered ? 'list-decimal' : 'list-disc'} marker:text-brand-700`}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </Tag>
      )
    }
    case 'table':
      return <Table headers={block.headers} rows={block.rows} />
    case 'steps':
      return (
        <ol className="space-y-2">
          {block.items.map((step, i) => (
            <li key={step.title} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold text-slate-900">{step.title}</p>
                {step.text && <p className="text-[15px] text-slate-700">{step.text}</p>}
              </div>
            </li>
          ))}
        </ol>
      )
    case 'verify':
      return (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[15px] text-amber-950">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            需確認現行規範
          </p>
          <p className="mt-1">{block.text}</p>
          {block.sources && <SourceList sources={block.sources} />}
        </div>
      )
    case 'note':
      return (
        <p className="flex gap-1.5 text-[15px] text-slate-600">
          <Info className="mt-1 size-4 shrink-0" aria-hidden />
          <span>{block.text}</span>
        </p>
      )
  }
}
