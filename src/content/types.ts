export interface SourceRef {
  label: string
  url: string
  checked: string
}

export type Block =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'steps'; items: { title: string; text?: string }[] }
  | { type: 'verify'; text: string; sources?: SourceRef[] }
  | { type: 'note'; text: string }

export interface Section {
  title: string
  pages: number[]
  blocks: Block[]
}

export interface Term {
  term: string
  definition: string
  pages: number[]
}

export interface CaseStudy {
  title: string
  kind: 'real' | 'textbook'
  source?: SourceRef
  pages: number[]
  facts: string[]
  analysis: { label: string; items: string[] }[]
  lesson: string
}

export interface Stage {
  id: number
  title: string
  shortTitle: string
  intro: string
  topics: string[]
  pageRange: string
  objectives: string[]
  sections: Section[]
  terms: Term[]
  cases: CaseStudy[]
  keyPoints: string[]
}
