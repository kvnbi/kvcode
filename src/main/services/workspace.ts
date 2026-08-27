import { readdir, readFile, writeFile, stat, realpath } from 'node:fs/promises'
import { basename, join, resolve, sep } from 'node:path'
import type { FileContent, FileNode, Workspace } from '@shared/types'

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

function assertAllowed(target: string): string {
  const candidate = resolve(target)

  for (const root of allowedRoots) {
    if (candidate === root || candidate.startsWith(root + sep)) {
      return candidate
    }
  }

  throw new Error('Path is outside of the open workspace')
}

export async function readDirectory(directory: string): Promise<FileNode[]> {
  const target = assertAllowed(directory)
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
  const target = assertAllowed(path)
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
  const target = assertAllowed(path)
  await writeFile(target, text, 'utf8')
}
