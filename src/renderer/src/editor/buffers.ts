import { monaco } from './monaco'
import type { editor } from 'monaco-editor'

interface Buffer {
  model: editor.ITextModel
  savedVersionId: number
}

const buffers = new Map<string, Buffer>()

export function hasBuffer(path: string): boolean {
  return buffers.has(path)
}

export function openBuffer(path: string, text: string): editor.ITextModel {
  const existing = buffers.get(path)

  if (existing) return existing.model

  const model = monaco.editor.createModel(text, undefined, monaco.Uri.file(path))
  buffers.set(path, { model, savedVersionId: model.getAlternativeVersionId() })

  return model
}

export function getModel(path: string): editor.ITextModel | null {
  return buffers.get(path)?.model ?? null
}

export function readBuffer(path: string): string | null {
  return buffers.get(path)?.model.getValue() ?? null
}

export function isBufferDirty(path: string): boolean {
  const buffer = buffers.get(path)
  return buffer ? buffer.model.getAlternativeVersionId() !== buffer.savedVersionId : false
}

export function markSaved(path: string): void {
  const buffer = buffers.get(path)

  if (buffer) {
    buffer.savedVersionId = buffer.model.getAlternativeVersionId()
  }
}

export function disposeBuffers(): void {
  for (const { model } of buffers.values()) {
    model.dispose()
  }

  buffers.clear()
}
