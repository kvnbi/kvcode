import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PROVIDERS,
  PROVIDER_CATALOG,
  PROVIDER_CHEAP,
  PROVIDER_MODELS,
  isKnownModel,
  pickModel,
  providerOf
} from './providers.ts'

test('a model whose provider has a key is kept', () => {
  assert.equal(pickModel('gpt-6-astra', ['openai']), 'gpt-6-astra')
})

test('a model with no key for its provider falls back to one you have', () => {
  assert.equal(pickModel('claude-opus-5', ['openai']), PROVIDER_MODELS.openai)
})

test('no keys at all leaves the choice alone', () => {
  assert.equal(pickModel('claude-opus-5', []), 'claude-opus-5')
})

test('several keys prefer the catalog order', () => {
  assert.equal(pickModel('claude-opus-5', ['openai', 'anthropic']), 'claude-opus-5')
})

test('the current model wins when its provider is among several with keys', () => {
  assert.equal(pickModel('gpt-6-astra', ['anthropic', 'openai']), 'gpt-6-astra')
})

test('every catalog model is known', () => {
  for (const provider of PROVIDERS) {
    for (const model of PROVIDER_CATALOG[provider]) {
      assert.ok(isKnownModel(model))
    }
  }
})

test('a stale model is not known', () => {
  assert.equal(isKnownModel('deepseek-v4-pro'), false)
  assert.equal(isKnownModel('claude-haiku-4-5'), false)
})

test('every catalog model maps back to its provider', () => {
  for (const provider of PROVIDERS) {
    for (const model of PROVIDER_CATALOG[provider]) {
      assert.equal(providerOf(model), provider)
    }
  }
})

for (const provider of PROVIDERS) {
  test(`${provider} has a cheap model inside its own catalog`, () => {
    assert.ok(PROVIDER_CATALOG[provider].includes(PROVIDER_CHEAP[provider]))
  })

  test(`${provider} has a default model inside its own catalog`, () => {
    assert.ok(PROVIDER_CATALOG[provider].includes(PROVIDER_MODELS[provider]))
  })
}

test('a stale stored model is not in any catalog', () => {
  for (const provider of PROVIDERS) {
    assert.ok(!PROVIDER_CATALOG[provider].includes('deepseek-v4-pro'))
    assert.ok(!PROVIDER_CATALOG[provider].includes('claude-haiku-4-5'))
    assert.ok(!PROVIDER_CATALOG[provider].includes('grok-4.6'))
  }
})

test('the catalog is exactly the six curated models', () => {
  assert.deepEqual(PROVIDER_CATALOG.anthropic, ['claude-opus-5', 'claude-sonnet-5'])
  assert.deepEqual(PROVIDER_CATALOG.openai, [
    'gpt-6-astra',
    'gpt-5.6-sol',
    'gpt-5.6-terra',
    'gpt-5.6-luna'
  ])
})
