import { createClient } from 'npm:@supabase/supabase-js@2'
import type { Deps } from './handlers.ts'

// SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY 由 Supabase 自動提供
const url = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const client = createClient(url, serviceKey, { auth: { persistSession: false } })

// 允許呼叫的網站網域；可用 ALLOWED_ORIGINS（逗號分隔）覆寫
const DEFAULT_ORIGINS = ['https://johnsonjunior37.github.io']

export const deps: Deps = {
  rpc: async (fn, args) => {
    const { data, error } = await client.rpc(fn, args)
    return { data, error: error ? { message: `${error.message} ${error.details ?? ''}` } : null }
  },
  // IP 雜湊用的鹽值：未另外設定 RATE_LIMIT_SALT 時，以伺服端金鑰代替，不會外流
  salt: Deno.env.get('RATE_LIMIT_SALT') || serviceKey,
  allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .concat(Deno.env.get('ALLOWED_ORIGINS') ? [] : DEFAULT_ORIGINS),
}
