import { deps } from '../_shared/deps.ts'
import { serveJson, submitAttempt } from '../_shared/handlers.ts'

Deno.serve((req) => serveJson(req, deps, submitAttempt))
