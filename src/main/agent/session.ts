import type Anthropic from '@anthropic-ai/sdk'
import type { ChatEvent } from '@shared/chat'
import { appendEntry, currentSession, projectFor, startSession } from '../services/conversations'
import { listRoots } from '../services/workspace'
import { AGENT_TOOLS, runTool } from './tools'
import { createTransport } from './transport'

const MAX_TOKENS = 64000
const MAX_STEPS = 12

const SYSTEM = [
  'You are the coding assistant inside kvcode, a desktop editor.',
  'Answer questions about the code in the folders the user has opened.',
  'Use list_files and read_file to look at real code before answering.',
  'You cannot write to disk. When a change is needed, explain it and show the proposed code in a fenced block.'
].join(' ')

const history: Anthropic.MessageParam[] = []

let controller: AbortController | null = null

export function resetSession(): void {
  history.length = 0
  startSession(listRoots()[0] ?? null)
}

function ensureSession(): void {
  const session = currentSession()

  if (session.file && session.project === projectFor(listRoots()[0] ?? null)) return

  resetSession()
}

export function cancelTurn(): void {
  controller?.abort()
  controller = null
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
}

function record(role: 'user' | 'assistant', content: unknown): void {
  appendEntry({ role, content, at: new Date().toISOString() })
}

async function resolveCalls(
  calls: Anthropic.ToolUseBlock[],
  emit: (event: ChatEvent) => void
): Promise<Anthropic.ToolResultBlockParam[]> {
  const results: Anthropic.ToolResultBlockParam[] = []

  for (const call of calls) {
    emit({ type: 'tool', name: call.name, detail: JSON.stringify(call.input) })

    try {
      results.push({
        type: 'tool_result',
        tool_use_id: call.id,
        content: await runTool(call.name, call.input)
      })
    } catch (error) {
      results.push({
        type: 'tool_result',
        tool_use_id: call.id,
        content: error instanceof Error ? error.message : String(error),
        is_error: true
      })
    }
  }

  return results
}

export async function runTurn(prompt: string, emit: (event: ChatEvent) => void): Promise<void> {
  emit({ type: 'start' })

  try {
    const active = createTransport()

    ensureSession()

    controller = new AbortController()
    history.push({ role: 'user', content: prompt })
    record('user', prompt)

    for (let step = 0; step < MAX_STEPS; step += 1) {
      const stream = active.transport.stream({
        model: active.model,
        system: SYSTEM,
        messages: history,
        tools: AGENT_TOOLS,
        maxTokens: MAX_TOKENS,
        signal: controller.signal
      })

      stream.onText((delta) => emit({ type: 'text', delta }))

      const message = await stream.finalMessage()

      history.push({ role: 'assistant', content: message.content })
      record('assistant', message.content)

      if (message.stop_reason !== 'tool_use') {
        emit({ type: 'message', text: textOf(message) })
        emit({ type: 'done' })
        return
      }

      const calls = message.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      )
      const results = await resolveCalls(calls, emit)

      history.push({ role: 'user', content: results })
      record('user', results)
    }

    emit({ type: 'error', message: 'The assistant used too many steps without finishing' })
  } catch (error) {
    emit({ type: 'error', message: error instanceof Error ? error.message : String(error) })
  } finally {
    controller = null
  }
}
