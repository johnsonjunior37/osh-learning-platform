import { deps } from '../_shared/deps.ts'
import { getReview, serveJson } from '../_shared/handlers.ts'

Deno.serve((req) => serveJson(req, deps, getReview))
