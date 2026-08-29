const INHERITED = new Set([
  'HOME',
  'LANG',
  'LOGNAME',
  'PATH',
  'SHELL',
  'SSH_AUTH_SOCK',
  'TMPDIR',
  'TZ',
  'USER',
  '__CF_USER_TEXT_ENCODING'
])

function cleanPath(value: string): string {
  return value
    .split(':')
    .filter((entry) => !entry.includes('/node_modules/.bin'))
    .join(':')
}

export function cleanEnvironment(): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value !== 'string') continue
    if (INHERITED.has(key) || key.startsWith('LC_')) result[key] = value
  }

  if (result.PATH) result.PATH = cleanPath(result.PATH)

  return result
}
