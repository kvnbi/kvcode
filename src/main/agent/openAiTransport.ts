import OpenAI from 'openai'
import type Anthropic from '@anthropic-ai/sdk'
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'
import type { ModelTransport, TransportParams, TransportStream } from './transport'

interface PendingCall {
  id: string
  name: string
  args: string
}

function toMessages(system: string, messages: Anthropic.MessageParam[]): ChatCompletionMessageParam[] {
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
      result.push({ role: 'user', content: text })
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

function toTools(tools: Anthropic.Tool[]): ChatCompletionTool[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description ?? '',
      parameters: tool.input_schema as Record<string, unknown>
    }
  }))
}

const COMPAT_MAX_TOKENS = 8192

export function createOpenAiTransport(
  apiKey: string,
  baseUrl: string,
  useCompletionTokens: boolean
): ModelTransport {
  const client = new OpenAI({ apiKey, baseURL: baseUrl })

  return {
    mode: 'direct',
    stream(params: TransportParams): TransportStream {
      const handlers: ((delta: string) => void)[] = []

      const completed = (async (): Promise<Anthropic.Message> => {
        const stream = await client.chat.completions.create(
          {
            model: params.model,
            ...(useCompletionTokens
              ? { max_completion_tokens: Math.min(params.maxTokens, COMPAT_MAX_TOKENS) }
              : { max_tokens: Math.min(params.maxTokens, COMPAT_MAX_TOKENS) }),
            messages: toMessages(params.system, params.messages),
            tools: toTools(params.tools),
            stream: true,
            ...(useCompletionTokens ? { stream_options: { include_usage: true } } : {})
          },
          { signal: params.signal }
        )

        const calls = new Map<number, PendingCall>()
        let text = ''
        let inputTokens = 0
        let outputTokens = 0

        for await (const chunk of stream) {
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens
            outputTokens = chunk.usage.completion_tokens
          }

          const delta = chunk.choices[0]?.delta

          if (!delta) continue

          if (typeof delta.content === 'string' && delta.content.length > 0) {
            text += delta.content
            for (const handler of handlers) handler(delta.content)
          }

          for (const call of delta.tool_calls ?? []) {
            const pending = calls.get(call.index) ?? { id: '', name: '', args: '' }

            calls.set(call.index, {
              id: call.id ?? pending.id,
              name: call.function?.name ?? pending.name,
              args: pending.args + (call.function?.arguments ?? '')
            })
          }
        }

        const toolUses = [...calls.values()].map(
          (call) =>
            ({
              type: 'tool_use',
              id: call.id,
              name: call.name,
              input: call.args ? (JSON.parse(call.args) as Record<string, unknown>) : {},
              caller: { type: 'direct' }
            }) as Anthropic.ToolUseBlock
        )

        const content: Anthropic.ContentBlock[] = []

        if (text.length > 0) content.push({ type: 'text', text, citations: [] })
        content.push(...toolUses)

        return {
          id: 'openai-compatible',
          type: 'message',
          role: 'assistant',
          model: params.model,
          content,
          stop_reason: toolUses.length > 0 ? 'tool_use' : 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cache_creation_input_tokens: null,
            cache_read_input_tokens: null,
            server_tool_use: null,
            service_tier: null
          }
        } as Anthropic.Message
      })()

      return {
        onText: (handler) => {
          handlers.push(handler)
        },
        finalMessage: () => completed
      }
    }
  }
}
