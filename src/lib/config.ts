export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** 未設定 Supabase 時為示範模式：可瀏覽教材與示範題，成績不儲存。 */
export const IS_DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY

export const SITE_TITLE = '職業安全衛生學習與測驗平台'

export function siteUrl(): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}`
}
