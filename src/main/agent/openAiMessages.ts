import type Anthropic from '@anthropic-ai/sdk'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

export function toMessages(system: string, messages: Anthropic.MessageParam[]): ChatCompletionMessageParam[] {
  const result: ChatCompletionMessageParam[] = [{ role: 'system', content: system }]

  for (const message of messages) {
    if (typeof message.content === 'string') {
      result.push({ role: message.role, content: message.content })
      continue
    }

    const text = message.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as Anthropic.TextBlock).text)
      .join('')

    if (message.role === 'assistant') {
      const calls = message.content.filter((block) => block.type === 'tool_use') as Anthropic.ToolUseBlock[]

      if (text.length === 0 && calls.length === 0) continue

      result.push({
        role: 'assistant',
        content: text,
        tool_calls: calls.length
          ? calls.map((call) => ({
              id: call.id,
              type: 'function' as const,
              function: { name: call.name, arguments: JSON.stringify(call.input) }
            }))
          : undefined
      })
      continue
    }

    const results = message.content.filter(
      (block) => block.type === 'tool_result'
    ) as Anthropic.ToolResultBlockParam[]

    if (results.length === 0) {
      if (text.length > 0) result.push({ role: 'user', content: text })
      continue
    }

    for (const item of results) {
      result.push({
        role: 'tool',
        tool_call_id: item.tool_use_id,
        content: typeof item.content === 'string' ? item.content : JSON.stringify(item.content)
      })
    }
  }

  return result
}
