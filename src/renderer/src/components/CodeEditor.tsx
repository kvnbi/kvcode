import { useEffect, useRef } from 'react'
import type { editor } from 'monaco-editor'
import { getModel, isBufferDirty } from '@renderer/editor/buffers'
import { monaco } from '@renderer/editor/monaco'
import { KVCODE_THEME } from '@renderer/editor/theme'
import { useEditorStore } from '@renderer/state/editorStore'

const FALLBACK_FONT = '"Inter Variable", "Inter", system-ui, sans-serif'

const EDITOR_OPTIONS: editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  fontSize: 13,
  lineHeight: 1.7,
  letterSpacing: 0,
  fontLigatures: false,
  disableMonospaceOptimizations: true,
  minimap: { enabled: false },
  bracketPairColorization: { enabled: false },
  padding: { top: 16, bottom: 24 },
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: 'on',
  renderLineHighlight: 'line',
  roundedSelection: true,
  guides: { indentation: true },
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false },
  overviewRulerLanes: 0,
  tabSize: 2,
  wordWrap: 'on'
}

function fontFamily(): string {
  const token = getComputedStyle(document.documentElement).getPropertyValue('--font-code').trim()
  return token || FALLBACK_FONT
}

export function CodeEditor({ className }: { className?: string }) {
  const container = useRef<HTMLDivElement>(null)
  const instance = useRef<editor.IStandaloneCodeEditor | null>(null)
  const activePath = useEditorStore((state) => state.activePath)

  useEffect(() => {
    if (!container.current) return

    const created = monaco.editor.create(container.current, {
      ...EDITOR_OPTIONS,
      fontFamily: fontFamily(),
      theme: KVCODE_THEME
    })

    const subscription = created.onDidChangeModelContent(() => {
      const path = created.getModel()?.uri.fsPath

      if (path) {
        useEditorStore.getState().setDirty(path, isBufferDirty(path))
      }
    })

    instance.current = created

    return () => {
      subscription.dispose()
      created.dispose()
      instance.current = null
    }
  }, [])

  useEffect(() => {
    const created = instance.current
    const model = activePath ? getModel(activePath) : null

    if (!created || !model) return

    created.setModel(model)
    created.focus()
  }, [activePath])

  return <div ref={container} className={className} />
}
