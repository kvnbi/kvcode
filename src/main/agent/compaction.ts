import type Anthropic from '@anthropic-ai/sdk'

const CHARS_PER_TOKEN = 4
const KEEP_RECENT = 6
const MAX_RESULT_CHARS = 600
const SUMMARY_INPUT_CHARS = 60000
const MIN_SUMMARY_CHARS = 2000
const MAX_SQUEEZE_CHARS = 4000
const MIN_SQUEEZE_CHARS = 100

type Message = Anthropic.MessageParam

export function estimateText(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

export function estimateTokens(messages: Message[]): number {
  if (messages.length === 0) return 0

  return estimateText(JSON.stringify(messages))
}

export function isTurnStart(message: Message): boolean {
  return message.role === 'user' && typeof message.content === 'string'
}

export function safeCutIndex(messages: Message[], keepRecent = KEEP_RECENT): number {
  for (let index = Math.max(0, messages.length - keepRecent); index > 0; index -= 1) {
    if (isTurnStart(messages[index])) return index
  }

  return 0
}

function truncate(text: string): string {
  if (text.length <= MAX_RESULT_CHARS) return text

  return `${text.slice(0, MAX_RESULT_CHARS)}\n[trimmed ${text.length - MAX_RESULT_CHARS} characters]`
}

function pruneContent(content: Message['content']): Message['content'] {
  if (typeof content === 'string') return content

  return content.map((block) => {
    if (block.type !== 'tool_result') return block

    const inner = block.content

    if (typeof inner === 'string') return { ...block, content: truncate(inner) }

    if (!Array.isArray(inner)) return block

    return {
      ...block,
      content: inner.map((part) =>
        part.type === 'text' ? { ...part, text: truncate(part.text) } : part
      )
    }
  })
}

export function pruneHistory(messages: Message[], keepRecent = KEEP_RECENT): Message[] {
  const boundary = Math.max(0, messages.length - keepRecent)

  return messages.map((message, index) =>
    index >= boundary ? message : { ...message, content: pruneContent(message.content) }
  )
}

export function charsFor(tokens: number): number {
  return Math.max(0, Math.floor(tokens)) * CHARS_PER_TOKEN
}

export function summaryPrompt(messages: Message[], maxChars = SUMMARY_INPUT_CHARS): string {
  const body = JSON.stringify(messages)
  const budget = Math.max(MIN_SUMMARY_CHARS, Math.min(maxChars, SUMMARY_INPUT_CHARS))

  return [
    'Summarise the conversation so far for your own future reference.',
    'Cover what the user asked for, what was done, which files were touched, and any decisions or constraints the user stated.',
    'Write it as compact notes, not prose.',
    '',
    body.length > budget ? body.slice(body.length - budget) : body
  ].join('\n')
}

function capText(text: string, cap: number): string {
  if (text.length <= cap) return text

  return `${text.slice(0, cap)}\n[trimmed ${text.length - cap} characters]`
}

function capContent(content: Message['content'], cap: number): Message['content'] {
  if (typeof content === 'string') return capText(content, cap)

  return content.map((block) => {
    if (block.type === 'text') return { ...block, text: capText(block.text, cap) }

    if (block.type !== 'tool_result') return block

    const inner = block.content

    if (typeof inner === 'string') return { ...block, content: capText(inner, cap) }

    if (!Array.isArray(inner)) return block

    return {
      ...block,
      content: inner.map((part) =>
        part.type === 'text' ? { ...part, text: capText(part.text, cap) } : part
      )
    }
  })
}

export function squeeze(messages: Message[], budget: number): Message[] {
  let cap = MAX_SQUEEZE_CHARS
  let out = messages

  while (cap >= MIN_SQUEEZE_CHARS) {
    out = messages.map((message) => ({ ...message, content: capContent(message.content, cap) }))

    if (estimateTokens(out) <= budget) return out

    cap = Math.floor(cap / 2)
  }

  return out
}

export function trimToBudget(messages: Message[], budget: number): Message[] {
  if (messages.length === 0 || estimateTokens(messages) <= budget) return messages

  const starts: number[] = []

  for (let index = 1; index < messages.length; index += 1) {
    if (isTurnStart(messages[index])) starts.push(index)
  }

  for (const start of starts) {
    if (estimateTokens(messages.slice(start)) <= budget) return messages.slice(start)
  }

  const last = starts.length > 0 ? messages.slice(starts[starts.length - 1]) : messages

  return squeeze(last, budget)
}

export function withSummary(summary: string, recent: Message[]): Message[] {
  return [{ role: 'user', content: `Summary of earlier conversation:\n${summary}` }, ...recent]
}
