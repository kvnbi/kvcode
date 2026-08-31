import { homedir } from 'node:os'
import { findIn, searchIn } from './walk'
import { authorizeRead, listRoots } from './workspace'

async function roots(path: string | null): Promise<string[]> {
  if (path) return [await authorizeRead(path)]

  const open = listRoots()

  if (open.length === 0) {
    throw new Error(
      `No folders are open. Pass an absolute path to search anywhere on this computer, for example ${homedir()}. The user will be asked to approve it.`
    )
  }

  return open
}

export async function findFiles(pattern: string, path: string | null): Promise<string> {
  return findIn(await roots(path), pattern)
}

export async function searchText(
  pattern: string,
  path: string | null,
  glob: string | null
): Promise<string> {
  return searchIn(await roots(path), pattern, glob)
}
