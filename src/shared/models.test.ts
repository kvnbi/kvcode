import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contextWindow, formatTokens, modelLabel } from './models.ts'

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

const windows: [string, number][] = [
  ['claude-opus-5', 1000000],
  ['claude-sonnet-5', 1000000],
  ['claude-fable-5', 1000000],
  ['claude-haiku-4-5', 200000],
  ['claude-haiku-4-5-20251001', 200000],
  ['gpt-5.6-sol', 1050000],
  ['gpt-5.6-terra', 1050000],
  ['gpt-5.6-luna', 1050000],
  ['gemini-3.7-flash', 1000000],
  ['gemini-3.1-pro', 1000000],
  ['deepseek-v4-pro', 1000000],
  ['deepseek-v4-flash', 1000000],
  ['grok-4.6', 500000],
  ['gpt-4o', 128000]
]

for (const [id, expected] of windows) {
  test(`context window for ${id}`, () => {
    assert.equal(contextWindow(id), expected)
  })
}

test('context window falls back for unknown ids', () => {
  assert.equal(contextWindow('some-new-model'), 128000)
})

test('older claude models keep the smaller window', () => {
  assert.equal(contextWindow('claude-3-5-sonnet-20241022'), 200000)
})

const formats: [number, string][] = [
  [0, '0'],
  [1, '1'],
  [999, '999'],
  [1000, '1k'],
  [12345, '12.3k'],
  [99900, '99.9k'],
  [123456, '123k'],
  [500000, '500k'],
  [1000000, '1M'],
  [1050000, '1.1M']
]

for (const [input, expected] of formats) {
  test(`formats ${input} as ${expected}`, () => {
    assert.equal(formatTokens(input), expected)
  })
}

test('formatTokens rejects broken counts', () => {
  assert.equal(formatTokens(-5), '0')
  assert.equal(formatTokens(Number.NaN), '0')
})
