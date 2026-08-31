import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modelLabel } from './models.ts'

const cases: [string, string][] = [
  ['claude-opus-5', 'Opus 5'],
  ['claude-sonnet-5', 'Sonnet 5'],
  ['claude-fable-5', 'Fable 5'],
  ['claude-haiku-4-5', 'Haiku 4.5'],
  ['claude-opus-4-8', 'Opus 4.8'],
  ['claude-haiku-4-5-20251001', 'Haiku 4.5 (2025-10-01)'],
  ['gpt-5.6-sol', 'GPT 5.6 Sol'],
  ['gpt-4o', 'GPT 4o'],
  ['gpt-4o-2024-08-06', 'GPT 4o (2024-08-06)'],
  ['gemini-3.7-flash', 'Gemini 3.7 Flash'],
  ['gemini-3.1-pro', 'Gemini 3.1 Pro'],
  ['deepseek-v4-pro', 'DeepSeek V4 Pro'],
  ['grok-4.6', 'Grok 4.6'],
  ['weird_model', 'Weird Model']
]

for (const [id, label] of cases) {
  test(`${id} renders as ${label}`, () => {
    assert.equal(modelLabel(id), label)
  })
}

test('a pinned snapshot never collides with its alias', () => {
  const labels = ['gpt-4o', 'gpt-4o-2024-08-06'].map(modelLabel)
  assert.equal(new Set(labels).size, labels.length)
})
