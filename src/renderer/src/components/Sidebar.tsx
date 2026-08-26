import { useEditorStore } from '@renderer/state/editorStore'
import { FolderIcon } from './Icons'
import { FileTree } from './FileTree'
import styles from './Sidebar.module.css'

export function Sidebar() {
  const workspace = useEditorStore((state) => state.workspace)
  const rootEntries = useEditorStore((state) =>
    state.workspace ? state.entries[state.workspace.path] : undefined
  )
  const openWorkspace = useEditorStore((state) => state.openWorkspace)

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <FolderIcon size={15} />
        </span>
        <div className={styles.headerTitle} title={workspace?.path}>
          {workspace ? workspace.name : 'No folder open'}
        </div>
      </div>

      <div className={styles.scroll}>
        {workspace && rootEntries ? (
          <FileTree nodes={rootEntries} />
        ) : (
          <div className={styles.empty}>
            <button type="button" className={styles.emptyButton} onClick={openWorkspace}>
              <FolderIcon size={13} />
              Open Folder
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
