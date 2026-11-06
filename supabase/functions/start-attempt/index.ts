import { deps } from '../_shared/deps.ts'
import { serveJson, startAttempt } from '../_shared/handlers.ts'

Deno.serve((req) => serveJson(req, deps, startAttempt))
