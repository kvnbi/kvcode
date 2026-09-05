import { SEARCH_KEY } from '@shared/providers'
import { readApiKey } from './secrets'

const ENDPOINT = 'https://api.tavily.com/search'
const MAX_RESULTS = 5
const MAX_CONTENT = 1200
const TIMEOUT = 20000

interface SearchResult {
  title?: string
  url?: string
  content?: string
}

export function searchReady(): boolean {
  return Boolean(readApiKey(SEARCH_KEY))
}

export async function webSearch(query: string): Promise<string> {
  const key = readApiKey(SEARCH_KEY)

  if (!key) throw new Error('No search key is saved. Add one in Settings to search the web.')

  const response = await fetch(process.env.KVCODE_SEARCH_URL || ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, max_results: MAX_RESULTS, search_depth: 'basic' }),
    signal: AbortSignal.timeout(TIMEOUT)
  })

  if (!response.ok) throw new Error(`Search failed with ${response.status}`)

  const body = (await response.json()) as { results?: SearchResult[] }
  const results = body.results ?? []

  if (results.length === 0) return 'No results.'

  return results
    .map((item) => `${item.title ?? 'Untitled'}\n${item.url ?? ''}\n${(item.content ?? '').slice(0, MAX_CONTENT)}`)
    .join('\n\n')
}
