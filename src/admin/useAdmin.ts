import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'

type State =
  | { status: 'loading' }
  | { status: 'unconfigured' }
  | { status: 'signed-out' }
  | { status: 'forbidden'; email: string }
  | { status: 'admin'; session: Session }

/** 檢查登入狀態與管理者身分；實際權限由資料庫 RLS 判斷，這裡只決定畫面 */
export function useAdmin(): State {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) {
      setState({ status: 'unconfigured' })
      return
    }
    let active = true
    const check = async (session: Session | null) => {
      if (!session) return active && setState({ status: 'signed-out' })
      const { data, error } = await sb.rpc('is_admin')
      if (!active) return
      if (error || data !== true) setState({ status: 'forbidden', email: session.user.email ?? '' })
      else setState({ status: 'admin', session })
    }
    sb.auth.getSession().then(({ data }) => check(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      void check(session)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return state
}

export async function signOut() {
  await getSupabase()?.auth.signOut()
}
