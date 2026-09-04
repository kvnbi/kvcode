import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_EFFORT, EFFORTS, effortLabel, effortsFor, resolveEffort } from './effort.ts'
import { PROVIDERS, PROVIDER_CATALOG } from './providers.ts'

test('claude models offer every level', () => {
  assert.deepEqual(effortsFor('claude-opus-5'), [...EFFORTS])
  assert.deepEqual(effortsFor('claude-sonnet-5'), [...EFFORTS])
})

test('openai models offer everything except max', () => {
  assert.deepEqual(effortsFor('gpt-6-astra'), ['low', 'medium', 'high', 'xhigh'])
  assert.deepEqual(effortsFor('gpt-5.6-luna'), ['low', 'medium', 'high', 'xhigh'])
})

test('max survives on a model that supports it', () => {
  assert.equal(resolveEffort('claude-opus-5', 'max'), 'max')
})

test('max degrades on a model without it', () => {
  assert.equal(resolveEffort('gpt-6-astra', 'max'), DEFAULT_EFFORT)
})

test('a shared level passes through on both sides', () => {
  for (const level of ['low', 'medium', 'high', 'xhigh'] as const) {
    assert.equal(resolveEffort('claude-opus-5', level), level)
    assert.equal(resolveEffort('gpt-6-astra', level), level)
  }
})

test('every catalog model accepts the default', () => {
  for (const provider of PROVIDERS) {
    for (const model of PROVIDER_CATALOG[provider]) {
      assert.equal(resolveEffort(model, DEFAULT_EFFORT), DEFAULT_EFFORT)
    }
  }
})

test('labels are capitalised for display', () => {
  assert.equal(effortLabel('xhigh'), 'Extra')
  assert.equal(effortLabel('low'), 'Low')
})
