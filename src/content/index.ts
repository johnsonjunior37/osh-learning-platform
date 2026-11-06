import { stage1 } from './stage1'
import { stage2 } from './stage2'
import { stage3 } from './stage3'
import { stage4 } from './stage4'
import { stage5 } from './stage5'
import type { Stage } from './types'

export const STAGES: Stage[] = [stage1, stage2, stage3, stage4, stage5]

export const QUESTIONS_PER_STAGE = 20
export const TOTAL_QUESTIONS = QUESTIONS_PER_STAGE * STAGES.length
export const PASS_SCORE = 80

export const SOURCE_DOCUMENT = {
  title: '一般安全衛生教育訓練',
  pages: 112,
}

export function getStage(id: number): Stage | undefined {
  return STAGES.find((s) => s.id === id)
}

export function formatPages(pages: number[]): string {
  if (pages.length === 0) return ''
  const sorted = [...new Set(pages)].sort((a, b) => a - b)
  const parts: string[] = []
  let start = sorted[0]
  let prev = sorted[0]
  for (const p of sorted.slice(1)) {
    if (p === prev + 1) {
      prev = p
      continue
    }
    parts.push(start === prev ? `P${start}` : `P${start}–P${prev}`)
    start = p
    prev = p
  }
  parts.push(start === prev ? `P${start}` : `P${start}–P${prev}`)
  return parts.join('、')
}
