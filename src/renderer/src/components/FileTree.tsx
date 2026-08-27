import { memo } from 'react'
import type { FileNode } from '@shared/types'
import { useEditorStore } from '@renderer/state/editorStore'
import { ChevronIcon, FileIcon, FolderIcon } from './Icons'
import styles from './FileTree.module.css'

const INDENT = 12
const BASE_PADDING = 8

interface TreeNodeProps {
  node: FileNode
  depth: number
}

const TreeNode = memo(function TreeNode({ node, depth }: TreeNodeProps) {
  const isExpanded = useEditorStore((state) => Boolean(state.expanded[node.path]))
  const isPending = useEditorStore((state) => Boolean(state.pending[node.path]))
  const isActive = useEditorStore((state) => state.activePath === node.path)
  const children = useEditorStore((state) => state.entries[node.path])
  const toggleDirectory = useEditorStore((state) => state.toggleDirectory)
  const openFile = useEditorStore((state) => state.openFile)

  const isDirectory = node.kind === 'directory'
  const hintPadding = BASE_PADDING + (depth + 1) * INDENT
  const rowClass = isActive ? `${styles.row} ${styles.active}` : styles.row

  return (
    <div>
      <button
        type="button"
        className={rowClass}
        style={{ paddingLeft: BASE_PADDING + depth * INDENT }}
        onClick={() => (isDirectory ? toggleDirectory(node.path) : openFile(node.path))}
        title={node.path}
      >
        {isDirectory ? (
          <ChevronIcon
            className={isExpanded ? `${styles.chevron} ${styles.chevronOpen}` : styles.chevron}
          />
        ) : (
          <span className={styles.chevronPlaceholder} />
        )}
        {isDirectory ? (
          <FolderIcon className={styles.icon} />
        ) : (
          <FileIcon className={styles.icon} />
        )}
        <span className={styles.name}>{node.name}</span>
      </button>

      {isDirectory && isExpanded ? (
        <div className={styles.children}>
          {children === undefined ? (
            isPending ? (
              <div className={styles.hint} style={{ paddingLeft: hintPadding }}>
                Loading
              </div>
            ) : null
          ) : children.length === 0 ? (
            <div className={styles.hint} style={{ paddingLeft: hintPadding }}>
              Empty
            </div>
          ) : (
            children.map((child) => <TreeNode key={child.path} node={child} depth={depth + 1} />)
          )}
        </div>
      ) : null}
    </div>
  )
})

export function FileTree({ nodes }: { nodes: FileNode[] }) {
  return (
    <div className={styles.list}>
      {nodes.map((node) => (
        <TreeNode key={node.path} node={node} depth={0} />
      ))}
    </div>
  )
}
