import { Suspense, lazy } from 'react'
import { selectIsDirty, useEditorStore } from '@renderer/state/editorStore'
import { basename, dirname, displayPath } from '@renderer/lib/path'
import { EmptyState } from './EmptyState'
import { FileIcon } from './Icons'
import styles from './EditorPane.module.css'

const CodeEditor = lazy(() =>
  import('./CodeEditor').then((module) => ({ default: module.CodeEditor }))
)

export function EditorPane() {
  const workspaces = useEditorStore((state) => state.workspaces)
  const activePath = useEditorStore((state) => state.activePath)
  const isDirty = useEditorStore(selectIsDirty)

  if (!activePath) {
    return <EmptyState />
  }

  const location = dirname(displayPath(workspaces, activePath))

  return (
    <div className={styles.pane}>
      <div className={styles.tab}>
        <span className={styles.tabIcon}>
          <FileIcon size={13} />
        </span>
        <span className={styles.tabName}>{basename(activePath)}</span>
        {isDirty ? <span className={styles.dirtyDot} /> : null}
        {location ? <span className={styles.tabPath}>{location}</span> : null}
      </div>
      <div className={styles.surface}>
        <Suspense fallback={null}>
          <CodeEditor className={styles.editor} />
        </Suspense>
      </div>
    </div>
  )
}
