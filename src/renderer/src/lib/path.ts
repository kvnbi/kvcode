export function basename(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

export function relativeTo(root: string, path: string): string {
  if (!path.startsWith(root)) return path
  return path.slice(root.length).replace(/^[\\/]/, '')
}

export function dirname(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  parts.pop()
  return parts.join('/')
}
