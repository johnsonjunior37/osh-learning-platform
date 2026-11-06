// 本機端對端測試用：以真實 Postgres 提供 /functions/v1/* 端點，行為與正式 Edge Function 相同
// 用法：TEST_DATABASE_URL=postgres://... deno run -A --config deno.json dev-server.ts
import pg from 'npm:pg@8'
import { type Deps, getReview, serveJson, startAttempt, submitAttempt } from '../functions/_shared/handlers.ts'

const pool = new pg.Pool({ connectionString: Deno.env.get('TEST_DATABASE_URL') })

const deps: Deps = {
  salt: 'dev',
  allowedOrigins: ['http://localhost:4173', 'http://localhost:5173'],
  rpc: async (fn, args) => {
    const client = await pool.connect()
    try {
      await client.query('set role service_role')
      const keys = Object.keys(args)
      const params = keys.map((k) => (args[k] !== null && typeof args[k] === 'object' ? JSON.stringify(args[k]) : args[k]))
      const res = await client.query(`select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`, params)
      return { data: res.rows[0].r, error: null }
    } catch (e) {
      return { data: null, error: { message: (e as Error).message } }
    } finally {
      await client.query('reset role')
      client.release()
    }
  },
}

const routes = { 'start-attempt': startAttempt, 'submit-attempt': submitAttempt, 'get-review': getReview } as const

Deno.serve({ port: 54321 }, (req) => {
  const name = new URL(req.url).pathname.replace('/functions/v1/', '') as keyof typeof routes
  const handler = routes[name]
  if (!handler) return new Response('not found', { status: 404 })
  return serveJson(req, deps, handler)
})
