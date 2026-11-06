import { LogIn, ShieldAlert } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabase'
import { signOut, useAdmin } from './useAdmin'

export function AdminLoginPage() {
  const state = useAdmin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (state.status === 'admin') return <Navigate to="/admin" replace />

  if (state.status === 'unconfigured')
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">管理者登入</h1>
        <p className="rounded-xl bg-amber-100 p-4 text-amber-900">
          尚未設定 Supabase，管理者後台無法使用。請依 README 的步驟完成設定。
        </p>
      </div>
    )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error: err } = await getSupabase()!.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (err) setError('帳號或密碼錯誤。')
  }

  return (
    <div className="mx-auto max-w-sm space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">管理者登入</h1>

      {state.status === 'forbidden' && (
        <div className="space-y-2 rounded-xl bg-rose-50 p-4 text-rose-800">
          <p className="flex items-center gap-1.5 font-semibold">
            <ShieldAlert className="size-5" aria-hidden />
            此帳號沒有管理者權限
          </p>
          <p className="text-[15px] break-all">{state.email}</p>
          <button type="button" onClick={signOut} className="min-h-11 font-semibold underline">
            登出
          </button>
        </div>
      )}

      {state.status !== 'forbidden' && (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block font-semibold">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="block font-semibold">
              密碼
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4"
            />
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-rose-50 p-3 text-rose-800">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || state.status === 'loading'}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 font-semibold text-white disabled:opacity-60"
          >
            <LogIn className="size-5" aria-hidden />
            {busy ? '登入中…' : '登入'}
          </button>
        </form>
      )}
    </div>
  )
}
