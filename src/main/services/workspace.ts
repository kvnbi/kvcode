import { readdir, readFile, rename, writeFile, stat, realpath } from 'node:fs/promises'
import { basename, dirname, join, resolve, sep } from 'node:path'
import type { FileContent, FileNode, Workspace } from '@shared/types'
import { isPathGranted, requestPermission } from './permissions'

const MAX_FILE_BYTES = 8 * 1024 * 1024
const BINARY_SNIFF_BYTES = 4096

const allowedRoots = new Set<string>()

export async function registerWorkspace(directory: string): Promise<Workspace> {
  const root = await realpath(resolve(directory))
  const info = await stat(root)

  if (!info.isDirectory()) {
    throw new Error('Selected path is not a directory')
  }

  allowedRoots.add(root)

  return { name: basename(root) || root, path: root }
}

export function listRoots(): string[] {
  return [...allowedRoots]
}

export function unregisterWorkspace(directory: string): void {
  allowedRoots.delete(resolve(directory))
}

function insideRoots(target: string): boolean {
  for (const root of allowedRoots) {
    if (target === root || target.startsWith(root + sep)) return true
  }

  return false
}

async function realTarget(path: string): Promise<string> {
  const candidate = resolve(path)

  try {
    return await realpath(candidate)
  } catch {
    const parent = await realpath(dirname(candidate))
    return join(parent, basename(candidate))
  }
}

async function authorize(path: string, kind: 'read' | 'write'): Promise<string> {
  const target = await realTarget(path)

  if (insideRoots(target) || isPathGranted(target)) return target

  const granted = await requestPermission(kind, target, dirname(target))

  if (!granted) {
    throw new Error('The user did not allow access to this path')
  }

  return target
}

export async function readDirectory(directory: string): Promise<FileNode[]> {
  const target = await authorize(directory, 'read')
  const entries = await readdir(target, { withFileTypes: true })

  return entries
    .filter((entry) => entry.isFile() || entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      path: join(target, entry.name),
      kind: entry.isDirectory() ? ('directory' as const) : ('file' as const)
    }))
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
}

function looksBinary(buffer: Buffer): boolean {
  const length = Math.min(buffer.length, BINARY_SNIFF_BYTES)

  for (let index = 0; index < length; index += 1) {
    if (buffer[index] === 0) return true
  }

  return false
}

export async function readTextFile(path: string): Promise<FileContent> {
  const target = await authorize(path, 'read')
  const info = await stat(target)

  if (!info.isFile()) {
    throw new Error('Path is not a file')
  }

  if (info.size > MAX_FILE_BYTES) {
    throw new Error('File is too large to open')
  }

  const buffer = await readFile(target)

  if (looksBinary(buffer)) {
    throw new Error('File appears to be binary')
  }

  return { path: target, text: buffer.toString('utf8') }
}

export async function writeTextFile(path: string, text: string): Promise<void> {
  const target = await authorize(path, 'write')

  if (Buffer.byteLength(text, 'utf8') > MAX_FILE_BYTES) {
    throw new Error('The new content is too large to write')
  }

  const existing = await stat(target).catch(() => null)

  if (existing && !existing.isFile()) {
    throw new Error('Path is not a file')
  }

  const temporary = `${target}.kvcode-${process.pid}`
  await writeFile(temporary, text, 'utf8')
  await rename(temporary, target)
}
