import { ChevronRight, Download, FileLock2, LogOut, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { formatDateTime, toCsv } from '../lib/format'
import { getSupabase } from '../lib/supabase'
import { signOut, useAdmin } from './useAdmin'

const STAGE_NAMES = '一二三四五'
const PAGE_SIZE = 50

interface AttemptRow {
  attempt_id: string
  participant_id: string
  name: string
  stage: number
  started_at: string
  submitted_at: string
  score: number
  correct_count: number
  total_count: number
  passed: boolean
}

interface StageStat {
  stage: number
  attempts: number
  passed: number
  pass_rate: number | null
  avg_score: number | null
}

interface Filters {
  name: string
  stage: string
  passed: string
}

// 搜尋字串中的 % 與 _ 是 SQL 萬用字元，需跳脫
function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`)
}

function buildQuery(filters: Filters) {
  let q = getSupabase()!.from('admin_attempts_view').select('*', { count: 'exact' })
  if (filters.name.trim()) q = q.ilike('name', `%${escapeLike(filters.name.trim())}%`)
  if (filters.stage) q = q.eq('stage', Number(filters.stage))
  if (filters.passed) q = q.eq('passed', filters.passed === 'yes')
  return q.order('submitted_at', { ascending: false })
}

export function AdminDashboardPage() {
  const state = useAdmin()
  const [stats, setStats] = useState<StageStat[]>([])
  const [rows, setRows] = useState<AttemptRow[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(0)
  const [filters, setFilters] = useState<Filters>({ name: '', stage: '', passed: '' })
  const [applied, setApplied] = useState<Filters>(filters)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const isAdmin = state.status === 'admin'

  useEffect(() => {
    if (!isAdmin) return
    getSupabase()!
      .from('stage_stats_view')
      .select('*')
      .then(({ data, error: err }) => {
        if (err) setError('無法載入統計資料。')
        else setStats((data ?? []) as StageStat[])
      })
  }, [isAdmin])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, count: total, error: err } = await buildQuery(applied).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)
    setLoading(false)
    if (err) return setError('無法載入測驗紀錄。')
    setRows((data ?? []) as AttemptRow[])
    setCount(total ?? 0)
  }, [applied, page])

  useEffect(() => {
    if (isAdmin) void load()
  }, [isAdmin, load])

  if (state.status === 'loading') return <p className="py-10 text-center text-slate-500">載入中…</p>
  if (state.status !== 'admin') return <Navigate to="/admin/login" replace />

  const exportCsv = async () => {
    setExporting(true)
    const all: AttemptRow[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error: err } = await buildQuery(applied).range(from, from + 999)
      if (err) {
        setExporting(false)
        return setError('匯出失敗，請稍後再試。')
      }
      all.push(...((data ?? []) as AttemptRow[]))
      if (!data || data.length < 1000) break
    }
    const csv = toCsv(
      ['測驗ID', '學員姓名', '測驗階段', '開始時間', '提交時間', '分數', '答對題數', '總題數', '是否通過'],
      all.map((r) => [
        r.attempt_id,
        r.name,
        `階段${STAGE_NAMES[r.stage - 1]}`,
        formatDateTime(r.started_at),
        formatDateTime(r.submitted_at),
        r.score,
        r.correct_count,
        r.total_count,
        r.passed ? '通過' : '未通過',
      ]),
    )
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `職安測驗成績_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  const openPrivateDoc = async (path: string) => {
    const { data, error: err } = await getSupabase()!.storage.from('private-docs').createSignedUrl(path, 300)
    if (err || !data) return setError('找不到檔案，請確認已上傳到 Storage 的 private-docs。')
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  const totalAttempts = stats.reduce((s, r) => s + r.attempts, 0)
  const totalPassed = stats.reduce((s, r) => s + r.passed, 0)
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900">成績管理</h1>
          <p className="truncate text-sm text-slate-500">{state.session.user.email}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 text-[15px]"
        >
          <LogOut className="size-4" aria-hidden />
          登出
        </button>
      </header>

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-rose-800">
          {error}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">各階段統計</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-brand-800 p-3 text-white">
            <p className="text-sm text-brand-100">全部測驗</p>
            <p className="text-2xl font-bold tabular-nums">{totalAttempts}</p>
            <p className="text-sm text-brand-100">
              通過率 {totalAttempts ? Math.round((1000 * totalPassed) / totalAttempts) / 10 : 0}%
            </p>
          </div>
          {stats.map((s) => (
            <div key={s.stage} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-brand-700">階段{STAGE_NAMES[s.stage - 1]}</p>
              <p className="text-sm text-slate-600">測驗 {s.attempts} 次</p>
              <p className="text-sm text-slate-600">通過率 {s.pass_rate === null ? '–' : `${s.pass_rate}%`}</p>
              <p className="text-sm text-slate-600">平均 {s.avg_score ?? '–'} 分</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">測驗紀錄</h2>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            setPage(0)
            setApplied(filters)
          }}
        >
          <div className="flex gap-2">
            <input
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              placeholder="搜尋學員姓名"
              aria-label="搜尋學員姓名"
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3"
            />
            <button type="submit" className="flex min-h-11 items-center gap-1 rounded-xl bg-brand-700 px-4 font-semibold text-white">
              <Search className="size-4" aria-hidden />
              搜尋
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={filters.stage}
              onChange={(e) => {
                const next = { ...filters, stage: e.target.value }
                setFilters(next)
                setPage(0)
                setApplied(next)
              }}
              aria-label="測驗階段"
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3"
            >
              <option value="">全部階段</option>
              {[1, 2, 3, 4, 5].map((s) => (
                <option key={s} value={s}>
                  階段{STAGE_NAMES[s - 1]}
                </option>
              ))}
            </select>
            <select
              value={filters.passed}
              onChange={(e) => {
                const next = { ...filters, passed: e.target.value }
                setFilters(next)
                setPage(0)
                setApplied(next)
              }}
              aria-label="通過狀態"
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3"
            >
              <option value="">全部狀態</option>
              <option value="yes">通過</option>
              <option value="no">未通過</option>
            </select>
          </div>
        </form>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-slate-600">共 {count} 筆</p>
          <button
            type="button"
            onClick={exportCsv}
            disabled={exporting || count === 0}
            className="flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 font-semibold disabled:opacity-50"
          >
            <Download className="size-4" aria-hidden />
            {exporting ? '匯出中…' : '匯出 CSV'}
          </button>
        </div>

        {loading ? (
          <p className="py-6 text-center text-slate-500">載入中…</p>
        ) : rows.length === 0 ? (
          <p className="rounded-xl bg-slate-100 p-4 text-center text-slate-600">沒有符合條件的紀錄。</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.attempt_id}>
                <Link
                  to={`/admin/attempts/${r.attempt_id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{r.name}</p>
                    <p className="text-sm text-slate-500">
                      階段{STAGE_NAMES[r.stage - 1]} · {formatDateTime(r.submitted_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums">{r.score}</p>
                    <p className={`text-sm font-semibold ${r.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {r.passed ? '通過' : '未通過'}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-slate-400" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 disabled:opacity-40"
            >
              上一頁
            </button>
            <span className="text-sm text-slate-600">
              {page + 1} / {pages}
            </span>
            <button
              type="button"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 disabled:opacity-40"
            >
              下一頁
            </button>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">管理者文件</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => openPrivateDoc('pdf-b-answers.pdf')}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white font-semibold"
          >
            <FileLock2 className="size-5" aria-hidden />
            PDF B 答案解析
          </button>
          <button
            type="button"
            onClick={() => openPrivateDoc('original-course.pdf')}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white font-semibold"
          >
            <FileLock2 className="size-5" aria-hidden />
            原始教材 PDF
          </button>
        </div>
      </section>
    </div>
  )
}
