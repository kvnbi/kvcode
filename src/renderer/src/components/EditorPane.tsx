import { Suspense, lazy } from 'react'
import { useEditorStore } from '@renderer/state/editorStore'
import { basename } from '@renderer/lib/path'
import { CloseIcon, FileIcon } from './Icons'
import styles from './EditorPane.module.css'

const CodeEditor = lazy(() =>
  import('./CodeEditor').then((module) => ({ default: module.CodeEditor }))
)

export function EditorPane() {
  const openPaths = useEditorStore((state) => state.openPaths)
  const activePath = useEditorStore((state) => state.activePath)
  const dirty = useEditorStore((state) => state.dirty)
  const openFile = useEditorStore((state) => state.openFile)
  const closeFile = useEditorStore((state) => state.closeFile)

  if (openPaths.length === 0) return null

  return (
    <div className={styles.pane}>
      <div className={styles.tabs}>
        {openPaths.map((path) => (
          <div
            key={path}
            className={path === activePath ? `${styles.tab} ${styles.tabOn}` : styles.tab}
            title={path}
          >
            <button type="button" className={styles.tabOpen} onClick={() => void openFile(path)}>
              <span className={styles.tabIcon}>
                <FileIcon size={13} />
              </span>
              <span className={styles.tabName}>{basename(path)}</span>
            </button>
            {dirty[path] ? <span className={styles.dirtyDot} /> : null}
            <button
              type="button"
              className={styles.tabClose}
              aria-label={`Close ${basename(path)}`}
              onClick={() => void closeFile(path)}
            >
              <CloseIcon size={10} />
            </button>
          </div>
        ))}
      </div>
      <div className={styles.surface}>
        <Suspense fallback={null}>
          <CodeEditor className={styles.editor} />
        </Suspense>
      </div>
    </div>
  )
}
