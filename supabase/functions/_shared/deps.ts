import { createClient } from 'npm:@supabase/supabase-js@2'
import type { Deps } from './handlers.ts'

// SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY 由 Supabase 自動提供
// RATE_LIMIT_SALT、ALLOWED_ORIGINS 需以 supabase secrets set 設定
const url = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const client = createClient(url, serviceKey, { auth: { persistSession: false } })

export const deps: Deps = {
  rpc: async (fn, args) => {
    const { data, error } = await client.rpc(fn, args)
    return { data, error: error ? { message: `${error.message} ${error.details ?? ''}` } : null }
  },
  salt: Deno.env.get('RATE_LIMIT_SALT') ?? '',
  allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
}

if (!deps.salt) console.warn('RATE_LIMIT_SALT 尚未設定')
if (deps.allowedOrigins.length === 0) console.warn('ALLOWED_ORIGINS 尚未設定，瀏覽器將無法呼叫')
