import Anthropic from '@anthropic-ai/sdk'
import type { ModelTransport, TransportParams, TransportStream } from './transport'
import { resolveEffort } from '@shared/effort'

export function createDirectTransport(apiKey: string, baseUrl: string): ModelTransport {
  const client = new Anthropic(baseUrl ? { apiKey, baseURL: baseUrl } : { apiKey })

  return {
    mode: 'direct',
    stream(params: TransportParams): TransportStream {
      const stream = client.messages.stream(
        {
          model: params.model,
          max_tokens: params.maxTokens,
          system: params.system,
          tools: params.tools,
          messages: params.messages,
          output_config: { effort: resolveEffort(params.model, params.effort) }
        } as Parameters<typeof client.messages.stream>[0],
        { signal: params.signal }
      )

      return {
        onText: (handler) => {
          stream.on('text', handler)
        },
        finalMessage: () => stream.finalMessage()
      }
    }
  }
}
