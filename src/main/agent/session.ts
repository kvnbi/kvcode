import { homedir } from 'node:os'
import type Anthropic from '@anthropic-ai/sdk'
import type { ChatEvent } from '@shared/chat'
import { appendEntry, currentSession, openSession, startSession } from '../services/conversations'
import { AGENT_TOOLS, WRITING_TOOLS, runTool } from './tools'
import { listRoots } from '../services/workspace'
import { createTransport } from './transport'

const MAX_TOKENS = 64000
const MAX_STEPS = 40

const SYSTEM = [
  'You are the coding assistant inside kvcode, a desktop editor.',
  `You can reach any file or folder on this computer. The home directory is ${homedir()}.`,
  'Paths outside the folders the user has opened are allowed, and the user is asked to approve them.',
  'Never refuse because no folder is open. Resolve the location the user named to an absolute path and use it.',
  'Use find_files and search_text to locate code, and read_file before answering.',
  'Edit existing files with edit_file, replacing only the lines that change. Use write_file only for new files.'
].join(' ')

const history: Anthropic.MessageParam[] = []

let controller: AbortController | null = null

export function resetSession(): void {
  history.length = 0
  startSession()
}

export function loadSession(id: string): void {
  history.length = 0

  for (const entry of openSession(id)) {
    history.push({ role: entry.role, content: entry.content } as Anthropic.MessageParam)
  }
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

      const input = call.input as { path?: string; cwd?: string }

      if (WRITING_TOOLS.has(call.name)) {
        if (input.path) emit({ type: 'file', path: input.path })
      }

      if (call.name === 'run_command') {
        const where = input.cwd ?? listRoots()[0]

        if (where) emit({ type: 'file', path: where })
      }
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

    if (!currentSession()) startSession()

    controller = new AbortController()
    history.push({ role: 'user', content: prompt })
    record('user', prompt)
    emit({ type: 'session', id: currentSession() })

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
