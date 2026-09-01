import { test } from 'node:test'
import assert from 'node:assert/strict'
import { kindFor, mediaTypeFor } from './attachments.ts'
import { supportsDocuments, supportsImages, unsupportedReason } from './models.ts'

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
  ['claude-haiku-4-5', true],
  ['gpt-5.6-sol', true],
  ['gemini-3.7-flash', true],
  ['grok-4.6', true],
  ['deepseek-v4-pro', false],
  ['deepseek-v4-flash', false]
]

for (const [model, ok] of vision) {
  test(`${model} image support is ${ok}`, () => {
    assert.equal(supportsImages(model), ok)
  })
}

const documents: [string, boolean][] = [
  ['claude-opus-5', true],
  ['gpt-5.6-sol', true],
  ['gemini-3.7-flash', false],
  ['grok-4.6', false],
  ['deepseek-v4-pro', false]
]

for (const [model, ok] of documents) {
  test(`${model} pdf support is ${ok}`, () => {
    assert.equal(supportsDocuments(model), ok)
  })
}

test('an unsupported image names the model in plain language', () => {
  assert.equal(unsupportedReason('deepseek-v4-pro', 'image'), 'DeepSeek V4 Pro cannot read images')
})

test('a supported pairing gives no reason', () => {
  assert.equal(unsupportedReason('claude-opus-5', 'image'), '')
  assert.equal(unsupportedReason('grok-4.6', 'text'), '')
})
