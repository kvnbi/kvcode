const FIELDS = ['command', 'path', 'pattern', 'query', 'cwd']

export function toolSummary(input: unknown): string {
  if (typeof input === 'string') return input
  if (input === null || typeof input !== 'object') return ''

  const record = input as Record<string, unknown>

  for (const field of FIELDS) {
    const value = record[field]

    if (typeof value === 'string' && value.length > 0) {
      const glob = record.glob

      return field === 'pattern' && typeof glob === 'string' && glob.length > 0
        ? `${value} in ${glob}`
        : value
    }
  }

  const first = Object.values(record).find((value) => typeof value === 'string' && value.length > 0)

  return typeof first === 'string' ? first : JSON.stringify(input)
}
