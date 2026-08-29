export interface DiffLine {
  kind: 'context' | 'add' | 'remove' | 'gap'
  text: string
  before: number
  after: number
  count: number
}

const CONTEXT = 3
const MAX_LCS = 1200

function split(text: string): string[] {
  if (text.length === 0) return []

  const lines = text.split('\n')

  if (lines[lines.length - 1] === '') lines.pop()

  return lines
}

type Step = 'same' | 'remove' | 'add'

function fallback(before: string[], after: string[]): Step[] {
  return [...before.map(() => 'remove' as Step), ...after.map(() => 'add' as Step)]
}

function align(before: string[], after: string[]): Step[] {
  if (before.length === 0) return after.map(() => 'add')
  if (after.length === 0) return before.map(() => 'remove')
  if (before.length > MAX_LCS || after.length > MAX_LCS) return fallback(before, after)

  const rows = before.length
  const columns = after.length
  const table: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(columns + 1).fill(0))

  for (let row = rows - 1; row >= 0; row -= 1) {
    for (let column = columns - 1; column >= 0; column -= 1) {
      table[row][column] =
        before[row] === after[column]
          ? table[row + 1][column + 1] + 1
          : Math.max(table[row + 1][column], table[row][column + 1])
    }
  }

  const steps: Step[] = []
  let row = 0
  let column = 0

  while (row < rows && column < columns) {
    if (before[row] === after[column]) {
      steps.push('same')
      row += 1
      column += 1
      continue
    }

    if (table[row + 1][column] >= table[row][column + 1]) {
      steps.push('remove')
      row += 1
      continue
    }

    steps.push('add')
    column += 1
  }

  while (row < rows) {
    steps.push('remove')
    row += 1
  }

  while (column < columns) {
    steps.push('add')
    column += 1
  }

  return steps
}

function collapse(lines: DiffLine[]): DiffLine[] {
  const keep = new Array<boolean>(lines.length).fill(false)

  lines.forEach((line, index) => {
    if (line.kind === 'context') return

    for (let near = index - CONTEXT; near <= index + CONTEXT; near += 1) {
      if (near >= 0 && near < lines.length) keep[near] = true
    }
  })

  const out: DiffLine[] = []
  let skipped = 0

  lines.forEach((line, index) => {
    if (keep[index]) {
      if (skipped > 0) {
        out.push({ kind: 'gap', text: '', before: 0, after: 0, count: skipped })
        skipped = 0
      }

      out.push(line)
      return
    }

    skipped += 1
  })

  if (skipped > 0) out.push({ kind: 'gap', text: '', before: 0, after: 0, count: skipped })

  return out
}

export function diffFile(beforeText: string, afterText: string): DiffLine[] {
  const before = split(beforeText)
  const after = split(afterText)

  let head = 0

  while (head < before.length && head < after.length && before[head] === after[head]) head += 1

  let tail = 0

  while (
    tail < before.length - head &&
    tail < after.length - head &&
    before[before.length - 1 - tail] === after[after.length - 1 - tail]
  ) {
    tail += 1
  }

  const steps = align(before.slice(head, before.length - tail), after.slice(head, after.length - tail))
  const lines: DiffLine[] = []
  let beforeLine = 1
  let afterLine = 1

  for (let index = 0; index < head; index += 1) {
    lines.push({ kind: 'context', text: before[index], before: beforeLine, after: afterLine, count: 0 })
    beforeLine += 1
    afterLine += 1
  }

  let beforeIndex = head
  let afterIndex = head

  for (const step of steps) {
    if (step === 'same') {
      lines.push({ kind: 'context', text: before[beforeIndex], before: beforeLine, after: afterLine, count: 0 })
      beforeIndex += 1
      afterIndex += 1
      beforeLine += 1
      afterLine += 1
      continue
    }

    if (step === 'remove') {
      lines.push({ kind: 'remove', text: before[beforeIndex], before: beforeLine, after: 0, count: 0 })
      beforeIndex += 1
      beforeLine += 1
      continue
    }

    lines.push({ kind: 'add', text: after[afterIndex], before: 0, after: afterLine, count: 0 })
    afterIndex += 1
    afterLine += 1
  }

  for (let index = before.length - tail; index < before.length; index += 1) {
    lines.push({ kind: 'context', text: before[index], before: beforeLine, after: afterLine, count: 0 })
    beforeLine += 1
    afterLine += 1
  }

  return lines.some((line) => line.kind !== 'context') ? collapse(lines) : []
}

export function countChanges(lines: DiffLine[]): { added: number; removed: number } {
  let added = 0
  let removed = 0

  for (const line of lines) {
    if (line.kind === 'add') added += 1
    if (line.kind === 'remove') removed += 1
  }

  return { added, removed }
}
