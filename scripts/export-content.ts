// 將教材內容輸出為 JSON，供 PDF 產生器使用
// 用法：npx tsx scripts/export-content.ts <輸出路徑>
import { writeFileSync } from 'node:fs'
import { STAGES } from '../src/content/index.ts'

const out = process.argv[2] ?? 'pdf-build/content.json'
writeFileSync(out, JSON.stringify(STAGES, null, 2))
console.log(`已輸出 ${STAGES.length} 個階段到 ${out}`)
