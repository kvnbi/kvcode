import type { Workspace } from '@shared/types'

export function basename(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

export function dirname(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  parts.pop()
  return parts.join('/')
}

export function isUnder(root: string, path: string): boolean {
  return path === root || path.startsWith(root + '/') || path.startsWith(root + '\\')
}

export function displayPath(workspaces: Workspace[], path: string): string {
  for (const workspace of workspaces) {
    if (!isUnder(workspace.path, path)) continue

    const rest = path.slice(workspace.path.length).replace(/^[\\/]/, '')
    return rest ? `${workspace.name}/${rest}` : workspace.name
  }

  return path
}
