import { test } from 'node:test'
import assert from 'node:assert/strict'
import { kindFor, mediaTypeFor } from './attachments.ts'
import { supportsDocuments, supportsImages, unsupportedReason } from './models.ts'
import { PROVIDERS, PROVIDER_CATALOG } from './providers.ts'

const kinds: [string, string][] = [
  ['shot.png', 'image'],
  ['photo.JPG', 'image'],
  ['icon.webp', 'image'],
  ['clip.gif', 'image'],
  ['paper.pdf', 'document'],
  ['main.ts', 'text'],
  ['notes', 'text']
]

for (const [name, kind] of kinds) {
  test(`${name} is a ${kind} attachment`, () => {
    assert.equal(kindFor(name), kind)
  })
}

test('media types match what the vision APIs accept', () => {
  assert.equal(mediaTypeFor('a.png'), 'image/png')
  assert.equal(mediaTypeFor('a.jpg'), 'image/jpeg')
  assert.equal(mediaTypeFor('a.jpeg'), 'image/jpeg')
  assert.equal(mediaTypeFor('a.pdf'), 'application/pdf')
})

const vision: [string, boolean][] = [
  ['claude-opus-5', true],
  ['claude-sonnet-5', true],
  ['gpt-6-astra', true],
  ['gpt-5.6-sol', true],
  ['gpt-5.6-terra', true],
  ['gpt-5.6-luna', true]
]

for (const [model, ok] of vision) {
  test(`${model} image support is ${ok}`, () => {
    assert.equal(supportsImages(model), ok)
  })
}

const documents: [string, boolean][] = [
  ['claude-opus-5', true],
  ['claude-sonnet-5', true],
  ['gpt-6-astra', true],
  ['gpt-5.6-sol', true],
  ['gpt-5.6-luna', true]
]

for (const [model, ok] of documents) {
  test(`${model} pdf support is ${ok}`, () => {
    assert.equal(supportsDocuments(model), ok)
  })
}

test('every catalog model takes images and documents', () => {
  for (const provider of PROVIDERS) {
    for (const model of PROVIDER_CATALOG[provider]) {
      assert.equal(unsupportedReason(model, 'image'), '')
      assert.equal(unsupportedReason(model, 'document'), '')
      assert.equal(unsupportedReason(model, 'text'), '')
    }
  }
})
