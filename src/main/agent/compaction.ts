import type Anthropic from '@anthropic-ai/sdk'

const CHARS_PER_TOKEN = 4
const KEEP_RECENT = 6
const MAX_RESULT_CHARS = 600

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

export function summaryPrompt(messages: Message[]): string {
  return [
    'Summarise the conversation so far for your own future reference.',
    'Cover what the user asked for, what was done, which files were touched, and any decisions or constraints the user stated.',
    'Write it as compact notes, not prose.',
    '',
    JSON.stringify(messages).slice(0, 60000)
  ].join('\n')
}

export function withSummary(summary: string, recent: Message[]): Message[] {
  return [{ role: 'user', content: `Summary of earlier conversation:\n${summary}` }, ...recent]
}
