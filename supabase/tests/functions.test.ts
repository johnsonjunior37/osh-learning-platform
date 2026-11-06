// Edge Function 處理邏輯的整合測試：以真實 Postgres 執行資料庫函式
// 用法：TEST_DATABASE_URL=postgres://... deno test -A supabase/tests/functions.test.ts
import { ok as assert, strictEqual as assertEquals } from 'node:assert'
import pg from 'npm:pg@8'
import { type Deps, getReview, serveJson, startAttempt, submitAttempt } from '../functions/_shared/handlers.ts'

const db = new pg.Client({ connectionString: Deno.env.get('TEST_DATABASE_URL') })
await db.connect()
await db.query('set role service_role')

const deps: Deps = {
  salt: 'test-salt',
  allowedOrigins: ['https://example.github.io'],
  rpc: async (fn, args) => {
    const keys = Object.keys(args)
    const params = keys.map((k) => {
      const v = args[k]
      return v !== null && typeof v === 'object' ? JSON.stringify(v) : v
    })
    try {
      const res = await db.query(
        `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`,
        params,
      )
      return { data: res.rows[0].r, error: null }
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } }
    }
  },
}

let ipCounter = 0
function post(fnBody: unknown, ip?: string) {
  return new Request('https://fn.local/', {
    method: 'POST',
    headers: {
      origin: 'https://example.github.io',
      'content-type': 'application/json',
      'x-forwarded-for': ip ?? `10.0.0.${++ipCounter}`,
    },
    body: typeof fnBody === 'string' ? fnBody : JSON.stringify(fnBody),
  })
}

async function answerKey(stage: number): Promise<Record<string, string>> {
  await db.query('reset role')
  const res = await db.query(
    'select k.question_id, k.answer from question_keys k join questions q on q.id = k.question_id where q.stage = $1',
    [stage],
  )
  await db.query('set role service_role')
  return Object.fromEntries(res.rows.map((r: { question_id: string; answer: string }) => [r.question_id, r.answer]))
}

Deno.test('CORS 預檢與方法限制', async () => {
  const pre = await serveJson(new Request('https://fn.local/', { method: 'OPTIONS', headers: { origin: 'https://example.github.io' } }), deps, startAttempt)
  assertEquals(pre.status, 204)
  assertEquals(pre.headers.get('access-control-allow-origin'), 'https://example.github.io')
  const evil = await serveJson(new Request('https://fn.local/', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }), deps, startAttempt)
  assertEquals(evil.headers.get('access-control-allow-origin'), 'https://example.github.io')
  const get = await serveJson(new Request('https://fn.local/'), deps, startAttempt)
  assertEquals(get.status, 405)
})

Deno.test('開始測驗需同意個資告知、姓名有效', async () => {
  assertEquals((await serveJson(post({ name: '王小明', stage: 1 }), deps, startAttempt)).status, 400)
  assertEquals((await serveJson(post({ name: '', stage: 1, consent: true }), deps, startAttempt)).status, 400)
  assertEquals((await serveJson(post({ name: '王小明', stage: 9, consent: true }), deps, startAttempt)).status, 400)
  assertEquals((await serveJson(post('not json'), deps, startAttempt)).status, 400)
})

Deno.test('完整流程：開始、提交、查看解析、不可重複提交', async () => {
  const startRes = await serveJson(post({ name: '王小明', stage: 1, consent: true }), deps, startAttempt)
  assertEquals(startRes.status, 200)
  const startText = await startRes.text()
  assert(!startText.includes('"answer"') && !startText.includes('explanation'), '開始測驗不可包含答案')
  const start = JSON.parse(startText)
  assertEquals(start.questions.length, 20)
  assert(typeof start.token === 'string' && start.token.length >= 40)

  const early = await serveJson(post({ attemptId: start.attemptId, token: start.token }), deps, getReview)
  assertEquals(early.status, 403)

  const key = await answerKey(1)
  const answers = Object.fromEntries(start.questions.map((q: { id: string }, i: number) => [q.id, i < 16 ? key[q.id] : 'Z']))
  const submit = await serveJson(post({ attemptId: start.attemptId, token: start.token, answers }), deps, submitAttempt)
  assertEquals(submit.status, 200)
  const result = await submit.json()
  assertEquals(result.score, 80)
  assertEquals(result.passed, true)
  assertEquals(result.correctCount, 16)
  assertEquals(result.wrongCount, 4)
  assertEquals(result.review.length, 20)

  const again = await serveJson(post({ attemptId: start.attemptId, token: start.token, answers }), deps, submitAttempt)
  assertEquals(again.status, 409)

  const wrongToken = await serveJson(post({ attemptId: start.attemptId, token: 'x'.repeat(43) }), deps, getReview)
  assertEquals(wrongToken.status, 404)

  const review = await serveJson(post({ attemptId: start.attemptId, token: start.token }), deps, getReview)
  assertEquals(review.status, 200)
  assertEquals((await review.json()).score, 80)
})

Deno.test('同一 IP 開始測驗超過 10 次會被限流', async () => {
  const statuses: number[] = []
  for (let i = 0; i < 11; i++) {
    statuses.push((await serveJson(post({ name: `限流${i}`, stage: 2, consent: true }, '192.168.9.9'), deps, startAttempt)).status)
  }
  assertEquals(statuses.slice(0, 10).every((s) => s === 200), true)
  assertEquals(statuses[10], 429)
})

Deno.test({
  name: '關閉連線',
  fn: async () => {
    await db.end()
  },
  sanitizeResources: false,
})
