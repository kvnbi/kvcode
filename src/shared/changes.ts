import type { DiffLine } from './diff'

export interface FileChange {
  id: string
  path: string
  at: string
  added: number
  removed: number
  reverted: boolean
  lines: DiffLine[]
}
