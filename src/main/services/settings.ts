import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

const FILE = 'layout.json'
const DELAY = 200

let pending: string | null = null
let timer: NodeJS.Timeout | undefined

function target(): string {
  return join(app.getPath('userData'), FILE)
}

export function readLayout(): string | null {
  try {
    return readFileSync(target(), 'utf8')
  } catch {
    return null
  }
}

export function flushLayout(): void {
  if (timer) {
    clearTimeout(timer)
    timer = undefined
  }

  if (pending === null) return

  try {
    writeFileSync(target(), pending, 'utf8')
  } finally {
    pending = null
  }
}

export function writeLayout(text: string): void {
  pending = text

  if (timer) clearTimeout(timer)
  timer = setTimeout(flushLayout, DELAY)
}
