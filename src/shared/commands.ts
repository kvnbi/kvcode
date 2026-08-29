const SHELL_SYNTAX = /[|&;<>$`\\\n(){}*?~!]/

const SAFE_GIT = new Set(['status', 'diff', 'log', 'branch', 'show', 'remote', 'describe', 'blame'])

const SAFE_EXACT = new Set([
  'pwd',
  'whoami',
  'date',
  'uname',
  'git status',
  'node -v',
  'node --version',
  'npm -v',
  'npm --version',
  'python3 --version',
  'tsc --version',
  'cargo --version',
  'go version'
])

export function isReadOnlyCommand(command: string): boolean {
  const trimmed = command.trim()

  if (trimmed.length === 0) return false
  if (SHELL_SYNTAX.test(trimmed)) return false

  const normalised = trimmed.split(/\s+/).join(' ')

  if (SAFE_EXACT.has(normalised)) return true

  const parts = normalised.split(' ')

  if (parts[0] !== 'git' || parts.length < 2) return false
  if (!SAFE_GIT.has(parts[1])) return false

  return !parts.some((part) => part === '--ext-diff' || part.startsWith('--output'))
}
