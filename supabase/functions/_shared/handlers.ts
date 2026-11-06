// 測驗 API 的處理邏輯。與 Supabase 連線的部分由呼叫端注入，方便在本機以真實 Postgres 測試。

export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>

export interface Deps {
  rpc: Rpc
  salt: string
  allowedOrigins: string[]
}

const LIMITS = {
  start: { limit: 10, windowSeconds: 3600 },
  submit: { limit: 30, windowSeconds: 3600 },
  review: { limit: 60, windowSeconds: 3600 },
}

const ERRORS: Record<string, { status: number; message: string }> = {
  invalid_name: { status: 400, message: '姓名需為 1 至 30 個字。' },
  invalid_stage: { status: 400, message: '請選擇測驗階段。' },
  invalid_token: { status: 400, message: '測驗憑證無效，請重新開始測驗。' },
  invalid_answers: { status: 400, message: '作答資料格式不正確。' },
  bank_not_ready: { status: 503, message: '此階段題庫尚未開放，請聯絡管理者。' },
  attempt_not_found: { status: 404, message: '找不到這次測驗，請重新開始。' },
  already_submitted: { status: 409, message: '這次測驗已經提交過了。' },
  attempt_expired: { status: 410, message: '測驗已超過 2 小時，請重新開始。' },
  not_submitted: { status: 403, message: '測驗提交後才能查看解析。' },
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const allowOrigin = origin && (allowed.includes('*') || allowed.includes(origin)) ? origin : allowed[0] ?? ''
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  return (fwd?.split(',')[0] ?? req.headers.get('cf-connecting-ip') ?? 'unknown').trim()
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text()
  if (text.length > 20_000) throw new HttpError(413, '資料過大。')
  try {
    const body = JSON.parse(text)
    if (body && typeof body === 'object' && !Array.isArray(body)) return body
  } catch {
    // 落到下方錯誤
  }
  throw new HttpError(400, '資料格式不正確。')
}

async function call(deps: Deps, fn: string, args: Record<string, unknown>) {
  const { data, error } = await deps.rpc(fn, args)
  if (error) {
    const code = Object.keys(ERRORS).find((k) => error.message.includes(k))
    if (code) throw new HttpError(ERRORS[code].status, ERRORS[code].message)
    console.error(fn, error.message)
    throw new HttpError(500, '系統暫時無法處理，請稍後再試。')
  }
  return data
}

async function limit(deps: Deps, req: Request, kind: keyof typeof LIMITS) {
  const ipHash = await sha256Hex(`${deps.salt}:${clientIp(req)}`)
  const { limit: max, windowSeconds } = LIMITS[kind]
  const ok = await call(deps, 'hit_rate_limit', { p_key: `${kind}:${ipHash}`, p_limit: max, p_window_seconds: windowSeconds })
  if (ok !== true) throw new HttpError(429, '操作太頻繁，請稍後再試。')
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function attemptArgs(body: Record<string, unknown>) {
  const attemptId = str(body.attemptId)
  const token = str(body.token)
  if (!UUID.test(attemptId) || token.length < 20 || token.length > 100) {
    throw new HttpError(400, ERRORS.invalid_token.message)
  }
  return { attemptId, token }
}

export async function startAttempt(req: Request, deps: Deps) {
  const body = await readJson(req)
  if (body.consent !== true) throw new HttpError(400, '請先閱讀並同意個人資料告知事項。')
  const name = str(body.name).trim()
  const stage = Number(body.stage)
  if (name.length < 1 || [...name].length > 30) throw new HttpError(400, ERRORS.invalid_name.message)
  if (!Number.isInteger(stage) || stage < 1 || stage > 5) throw new HttpError(400, ERRORS.invalid_stage.message)
  await limit(deps, req, 'start')
  const token = randomToken()
  const data = (await call(deps, 'start_attempt', {
    p_name: name,
    p_stage: stage,
    p_token_hash: await sha256Hex(token),
  })) as Record<string, unknown>
  return { ...data, token }
}

export async function submitAttempt(req: Request, deps: Deps) {
  const body = await readJson(req)
  const { attemptId, token } = attemptArgs(body)
  const raw = body.answers
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400, ERRORS.invalid_answers.message)
  const answers: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (/^[A-Z0-9-]{1,20}$/.test(k) && typeof v === 'string' && /^[ABCD]$/.test(v)) answers[k] = v
  }
  await limit(deps, req, 'submit')
  return call(deps, 'submit_attempt', {
    p_attempt_id: attemptId,
    p_token_hash: await sha256Hex(token),
    p_answers: answers,
  })
}

export async function getReview(req: Request, deps: Deps) {
  const body = await readJson(req)
  const { attemptId, token } = attemptArgs(body)
  await limit(deps, req, 'review')
  return call(deps, 'get_attempt_review', { p_attempt_id: attemptId, p_token_hash: await sha256Hex(token) })
}

/** 包裝 CORS、方法檢查與錯誤處理 */
export async function serveJson(
  req: Request,
  deps: Deps,
  handler: (req: Request, deps: Deps) => Promise<unknown>,
): Promise<Response> {
  const cors = corsHeaders(req.headers.get('origin'), deps.allowedOrigins)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  const headers = { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: '只接受 POST。' }), { status: 405, headers })
  try {
    const data = await handler(req, deps)
    return new Response(JSON.stringify(data), { status: 200, headers })
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    const message = e instanceof HttpError ? e.message : '系統暫時無法處理，請稍後再試。'
    if (!(e instanceof HttpError)) console.error(e)
    return new Response(JSON.stringify({ error: message }), { status, headers })
  }
}
