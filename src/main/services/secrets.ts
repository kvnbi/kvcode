import { chmodSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { app, safeStorage } from 'electron'
import type { ProviderId } from '@shared/providers'

const FILE = 'credentials.bin'

type KeyMap = Partial<Record<ProviderId, string>>

function target(): string {
  return join(app.getPath('userData'), FILE)
}

export function secretsAvailable(): boolean {
  return safeStorage.isEncryptionAvailable()
}

function readAll(): KeyMap {
  if (!secretsAvailable()) return {}

  try {
    return JSON.parse(safeStorage.decryptString(readFileSync(target()))) as KeyMap
  } catch {
    return {}
  }
}

function writeAll(keys: KeyMap): void {
  const remaining = Object.entries(keys).filter(([, value]) => Boolean(value))

  if (remaining.length === 0) {
    rmSync(target(), { force: true })
    return
  }

  const file = target()
  writeFileSync(file, safeStorage.encryptString(JSON.stringify(Object.fromEntries(remaining))), {
    mode: 0o600
  })
  chmodSync(file, 0o600)
}

export function readApiKey(provider: ProviderId): string | null {
  return readAll()[provider] ?? null
}

export function storedProviders(): ProviderId[] {
  return Object.keys(readAll()) as ProviderId[]
}

export function writeApiKey(provider: ProviderId, value: string): void {
  if (!secretsAvailable()) {
    throw new Error('The system keychain is unavailable, so the key cannot be stored securely')
  }

  writeAll({ ...readAll(), [provider]: value })
}

export function clearApiKey(provider: ProviderId): void {
  const keys = readAll()
  delete keys[provider]
  writeAll(keys)
}
