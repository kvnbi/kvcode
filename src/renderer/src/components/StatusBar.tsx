import { selectIsDirty, useEditorStore } from '@renderer/state/editorStore'
import { relativeTo } from '@renderer/lib/path'
import styles from './StatusBar.module.css'

export function StatusBar() {
  const workspace = useEditorStore((state) => state.workspace)
  const activePath = useEditorStore((state) => state.activePath)
  const status = useEditorStore((state) => state.status)
  const isDirty = useEditorStore(selectIsDirty)

  const location = activePath && workspace ? relativeTo(workspace.path, activePath) : activePath

  return (
    <footer className={styles.bar}>
      <span className={styles.item}>{location ?? 'Ready'}</span>
      <span className={styles.spacer} />
      {status.kind !== 'idle' && status.message ? (
        <span
          className={`${styles.item} ${status.kind === 'error' ? styles.error : styles.info}`}
        >
          <span className={styles.pulse} />
          {status.message}
        </span>
      ) : null}
      {activePath ? <span className={styles.item}>{isDirty ? 'Unsaved' : 'Saved'}</span> : null}
    </footer>
  )
}
