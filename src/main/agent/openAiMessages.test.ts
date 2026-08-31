import { test } from 'node:test'
import assert from 'node:assert/strict'
import type Anthropic from '@anthropic-ai/sdk'
import { toMessages } from './openAiMessages.ts'

const SYSTEM = 'you are an agent'

test('a plain exchange converts to system, user and assistant', () => {
  const out = toMessages(SYSTEM, [
    { role: 'user', content: 'hello' },
    { role: 'assistant', content: [{ type: 'text', text: 'hi' }] }
  ])
  assert.deepEqual(out.map((m) => m.role), ['system', 'user', 'assistant'])
})

test('an assistant message holding only thinking is dropped', () => {
  const out = toMessages(SYSTEM, [
    { role: 'user', content: 'go' },
    { role: 'assistant', content: [{ type: 'thinking', thinking: 'quiet', signature: 's' }] as Anthropic.ContentBlockParam[] }
  ])
  assert.deepEqual(out.map((m) => m.role), ['system', 'user'])
})

test('thinking is stripped but sibling text survives', () => {
  const out = toMessages(SYSTEM, [
    { role: 'assistant', content: [
      { type: 'thinking', thinking: 'quiet', signature: 's' },
      { type: 'text', text: 'spoken' }
    ] as Anthropic.ContentBlockParam[] }
  ])
  assert.equal(out.length, 2)
  assert.equal(out[1].content, 'spoken')
})

test('no converted message is an empty assistant turn', () => {
  const out = toMessages(SYSTEM, [
    { role: 'user', content: 'go' },
    { role: 'assistant', content: [{ type: 'thinking', thinking: 'x', signature: 's' }] as Anthropic.ContentBlockParam[] },
    { role: 'assistant', content: [{ type: 'text', text: 'done' }] }
  ])
  const empty = out.filter((m) => m.role === 'assistant' && !m.content && !('tool_calls' in m && m.tool_calls))
  assert.equal(empty.length, 0)
})

test('a tool call becomes tool_calls and its result a tool message', () => {
  const out = toMessages(SYSTEM, [
    { role: 'user', content: 'read it' },
    { role: 'assistant', content: [{ type: 'tool_use', id: 'tu1', name: 'read_file', input: { path: 'a.ts' } }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu1', content: 'body' }] }
  ])
  assert.deepEqual(out.map((m) => m.role), ['system', 'user', 'assistant', 'tool'])
  const call = out[2] as { tool_calls?: { id: string }[] }
  assert.equal(call.tool_calls?.[0].id, 'tu1')
  assert.equal((out[3] as { tool_call_id: string }).tool_call_id, 'tu1')
})

test('every tool message is preceded by an assistant carrying tool_calls', () => {
  const out = toMessages(SYSTEM, [
    { role: 'user', content: 'go' },
    { role: 'assistant', content: [
      { type: 'thinking', thinking: 'plan', signature: 's' },
      { type: 'tool_use', id: 'tu1', name: 'read_file', input: {} }
    ] as Anthropic.ContentBlockParam[] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu1', content: 'body' }] }
  ])
  out.forEach((message, index) => {
    if (message.role !== 'tool') return
    const previous = out[index - 1] as { role: string; tool_calls?: unknown[] }
    assert.equal(previous.role, 'assistant')
    assert.ok(previous.tool_calls && previous.tool_calls.length > 0)
  })
})

test('an empty user message is not forwarded', () => {
  const out = toMessages(SYSTEM, [{ role: 'user', content: [] }])
  assert.deepEqual(out.map((m) => m.role), ['system'])
})
