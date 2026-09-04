import { chmodSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { MAX_INSTRUCTIONS } from '@shared/chat'
import { DEFAULT_EFFORT, EFFORTS } from '@shared/effort'
import type { Effort } from '@shared/effort'
import { PROVIDER_MODELS, isKnownModel } from '@shared/providers'
import type { ProviderId } from '@shared/providers'

const LAYOUT_FILE = 'layout.json'
const PREFERENCES_FILE = 'preferences.json'
const DELAY = 200

let pending: string | null = null
let timer: NodeJS.Timeout | undefined

function target(name: string): string {
  return join(app.getPath('userData'), name)
}

export function readLayout(): string | null {
  try {
    return readFileSync(target(LAYOUT_FILE), 'utf8')
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
    const file = target(LAYOUT_FILE)
    writeFileSync(file, pending, { encoding: 'utf8', mode: 0o600 })
    chmodSync(file, 0o600)
  } finally {
    pending = null
  }
}

export function writeLayout(text: string): void {
  pending = text

  if (timer) clearTimeout(timer)
  timer = setTimeout(flushLayout, DELAY)
}

interface Preferences {
  mode: 'direct' | 'proxy'
  model: string
  instructions: string
  effort: Effort
}

interface LegacyPreferences {
  provider?: ProviderId
  models?: Record<ProviderId, string>
}

const DEFAULT_PREFERENCES: Preferences = {
  mode: 'direct',
  model: PROVIDER_MODELS.anthropic,
  instructions: '',
  effort: DEFAULT_EFFORT
}

export function readPreferences(): Preferences {
  try {
    const parsed = JSON.parse(readFileSync(target(PREFERENCES_FILE), 'utf8')) as Partial<Preferences> &
      LegacyPreferences
    const legacyModel = parsed.provider && parsed.models ? parsed.models[parsed.provider] : undefined
    const model = parsed.model ?? legacyModel

    return {
      mode: parsed.mode === 'proxy' ? 'proxy' : 'direct',
      model: model && isKnownModel(model) ? model : DEFAULT_PREFERENCES.model,
      instructions:
        typeof parsed.instructions === 'string' ? parsed.instructions.slice(0, MAX_INSTRUCTIONS) : '',
      effort: EFFORTS.includes(parsed.effort as Effort) ? (parsed.effort as Effort) : DEFAULT_EFFORT
    }
  } catch {
    return { ...DEFAULT_PREFERENCES }
  }
}

export function writePreferences(next: Partial<Preferences>): Preferences {
  const merged = { ...readPreferences(), ...next }
  const file = target(PREFERENCES_FILE)
  writeFileSync(file, JSON.stringify(merged, null, 2), { encoding: 'utf8', mode: 0o600 })
  chmodSync(file, 0o600)
  return merged
}
