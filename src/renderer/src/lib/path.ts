export function basename(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

export function dirname(path: string): string {
  const at = path.lastIndexOf('/')
  return at > 0 ? path.slice(0, at) : '/'
}

export function isUnder(root: string, path: string): boolean {
  return path === root || path.startsWith(root + '/') || path.startsWith(root + '\\')
}
