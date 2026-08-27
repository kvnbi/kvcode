import { useEditorStore } from '@renderer/state/editorStore'
import type { Workspace } from '@shared/types'
import { ChevronIcon, CloseIcon } from './Icons'
import { FileTree } from './FileTree'
import styles from './Sidebar.module.css'

function Root({ workspace }: { workspace: Workspace }) {
  const isExpanded = useEditorStore((state) => Boolean(state.expanded[workspace.path]))
  const nodes = useEditorStore((state) => state.entries[workspace.path])
  const toggleDirectory = useEditorStore((state) => state.toggleDirectory)
  const closeFolder = useEditorStore((state) => state.closeFolder)

  return (
    <div className={styles.root}>
      <div className={styles.rootRow}>
        <button
          type="button"
          className={styles.rootToggle}
          onClick={() => toggleDirectory(workspace.path)}
          title={workspace.path}
        >
          <ChevronIcon
            className={isExpanded ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron}
          />
          <span className={styles.rootName}>{workspace.name}</span>
        </button>
        <button
          type="button"
          className={styles.close}
          onClick={() => closeFolder(workspace.path)}
          title="Close folder"
          aria-label={`Close ${workspace.name}`}
        >
          <CloseIcon size={12} />
        </button>
      </div>
      {isExpanded && nodes ? <FileTree nodes={nodes} /> : null}
    </div>
  )
}

export function Sidebar() {
  const workspaces = useEditorStore((state) => state.workspaces)

  return (
    <aside className={styles.sidebar}>
      <div className={styles.scroll}>
        {workspaces.map((workspace) => (
          <Root key={workspace.path} workspace={workspace} />
        ))}
      </div>
    </aside>
  )
}
