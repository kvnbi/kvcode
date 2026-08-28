import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, join, relative } from 'node:path'
import { authorizeRead, listRoots } from './workspace'

const IGNORED = new Set([
  '.cache',
  '.git',
  '.next',
  '.turbo',
  '.venv',
  '.vite',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'target',
  'vendor'
])

const MAX_WALK = 20000
const MAX_PATHS = 200
const MAX_MATCHES = 100
const MAX_LINE = 200
const MAX_BYTES = 1024 * 1024

function escape(value: string): string {
  return value.replace(/[.+^${}()|[\]\\]/g, '\\$&')
}

function globToRegExp(pattern: string): RegExp {
  let source = ''

  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index]

    if (character === '*') {
      if (pattern[index + 1] === '*') {
        source += '.*'
        index += 1
        if (pattern[index + 1] === '/') index += 1
        continue
      }

      source += '[^/]*'
      continue
    }

    source += character === '?' ? '[^/]' : escape(character)
  }

  return new RegExp(`^${source}$`)
}

function matcher(pattern: string): (path: string, root: string) => boolean {
  const expression = globToRegExp(pattern)
  const bare = !pattern.includes('/')

  return (path, root) => expression.test(bare ? basename(path) : relative(root, path))
}

async function* walk(root: string): AsyncGenerator<[string, string]> {
  const queue = [root]
  let seen = 0

  while (queue.length > 0) {
    const directory = queue.shift() as string
    let entries

    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      if (entry.isSymbolicLink() || IGNORED.has(entry.name)) continue

      const path = join(directory, entry.name)

      if (entry.isDirectory()) {
        queue.push(path)
        continue
      }

      if (!entry.isFile()) continue

      yield [path, root]
      seen += 1

      if (seen >= MAX_WALK) return
    }
  }
}

async function* walkAll(path: string | null): AsyncGenerator<[string, string]> {
  if (path) {
    yield* walk(await authorizeRead(path))
    return
  }

  const open = listRoots()

  if (open.length === 0) throw new Error('No folders are open.')

  for (const root of open) yield* walk(root)
}

function report(results: string[], limit: number, unit: string, empty: string): string {
  if (results.length === 0) return empty

  const capped = results.length >= limit ? `\nStopped at ${limit} ${unit}.` : ''

  return results.join('\n') + capped
}

export async function findFiles(pattern: string, path: string | null): Promise<string> {
  const matches = matcher(pattern)
  const results: string[] = []

  for await (const [file, root] of walkAll(path)) {
    if (!matches(file, root)) continue

    results.push(file)

    if (results.length >= MAX_PATHS) break
  }

  return report(results, MAX_PATHS, 'files', 'No files matched.')
}

async function readSearchable(file: string): Promise<string[] | null> {
  try {
    if ((await stat(file)).size > MAX_BYTES) return null

    const text = await readFile(file, 'utf8')

    return text.indexOf('\u0000') === -1 ? text.split('\n') : null
  } catch {
    return null
  }
}

export async function searchText(
  pattern: string,
  path: string | null,
  glob: string | null
): Promise<string> {
  let expression: RegExp

  try {
    expression = new RegExp(pattern)
  } catch {
    throw new Error('pattern is not a valid regular expression')
  }

  const matches = glob ? matcher(glob) : null
  const results: string[] = []

  for await (const [file, root] of walkAll(path)) {
    if (matches && !matches(file, root)) continue

    const lines = await readSearchable(file)

    if (!lines) continue

    for (let index = 0; index < lines.length && results.length < MAX_MATCHES; index += 1) {
      if (expression.test(lines[index])) {
        results.push(`${file}:${index + 1}: ${lines[index].trim().slice(0, MAX_LINE)}`)
      }
    }

    if (results.length >= MAX_MATCHES) break
  }

  return report(results, MAX_MATCHES, 'matches', 'No matches.')
}
