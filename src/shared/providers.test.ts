import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PROVIDERS, PROVIDER_CATALOG, PROVIDER_CHEAP, PROVIDER_MODELS, pickProvider } from './providers.ts'

test('a provider with a key is kept', () => {
  assert.equal(pickProvider('deepseek', ['deepseek']), 'deepseek')
})

test('a provider with no key falls back to the one you have', () => {
  assert.equal(pickProvider('anthropic', ['deepseek']), 'deepseek')
})

test('no keys at all leaves the choice alone', () => {
  assert.equal(pickProvider('anthropic', []), 'anthropic')
})

test('several keys prefer the catalog order', () => {
  assert.equal(pickProvider('google', ['xai', 'openai']), 'openai')
})

test('the current provider wins even when others are present', () => {
  assert.equal(pickProvider('xai', ['openai', 'xai']), 'xai')
})

for (const provider of PROVIDERS) {
  test(`${provider} has a cheap model inside its own catalog`, () => {
    assert.ok(PROVIDER_CATALOG[provider].includes(PROVIDER_CHEAP[provider]))
  })

  test(`${provider} has a default model inside its own catalog`, () => {
    assert.ok(PROVIDER_CATALOG[provider].includes(PROVIDER_MODELS[provider]))
  })
}
