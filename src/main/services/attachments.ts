import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { app } from 'electron'
import { MAX_ATTACHMENT_BYTES, kindFor, mediaTypeFor } from '@shared/attachments'
import type { Attachment } from '@shared/attachments'

function root(): string {
  const directory = join(app.getPath('userData'), 'attachments')
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  return directory
}

function fileFor(id: string, name: string): string {
  return join(root(), `${id}${extname(name).toLowerCase()}`)
}

function locate(id: string): string {
  const directory = root()

  for (const suffix of ['', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf']) {
    const candidate = join(directory, `${id}${suffix}`)
    if (existsSync(candidate)) return candidate
  }

  return ''
}

export function idForData(data: string): string {
  return createHash('sha256').update(Buffer.from(data, 'base64')).digest('hex').slice(0, 32)
}

export function storeBytes(name: string, bytes: Buffer): Attachment {
  if (bytes.length > MAX_ATTACHMENT_BYTES) {
    throw new Error(`${name} is larger than ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} MB`)
  }

  const id = createHash('sha256').update(bytes).digest('hex').slice(0, 32)
  const target = fileFor(id, name)

  if (!existsSync(target)) writeFileSync(target, bytes, { mode: 0o600 })

  return { id, name: basename(name), kind: kindFor(name), mediaType: mediaTypeFor(name), size: bytes.length }
}

export function attachPath(target: string): Attachment {
  if (!existsSync(target) || !statSync(target).isFile()) throw new Error(`${target} is not a file`)

  const kind = kindFor(target)

  if (kind === 'text') {
    return {
      id: createHash('sha256').update(target).digest('hex').slice(0, 32),
      name: basename(target),
      kind,
      mediaType: mediaTypeFor(target),
      size: statSync(target).size,
      path: target
    }
  }

  return storeBytes(target, readFileSync(target))
}

export function attachBytes(name: string, data: string): Attachment {
  return storeBytes(name, Buffer.from(data, 'base64'))
}

export function readAttachment(id: string): string {
  const target = locate(id)

  return target ? readFileSync(target).toString('base64') : ''
}
