import { useCallback, useEffect, useState } from 'react'
import type { FileChange } from '@shared/changes'
import { basename } from '@renderer/lib/path'
import { useEditorStore } from '@renderer/state/editorStore'
import styles from './DiffPanel.module.css'

export function DiffPanel({ width }: { width?: number }) {
  const [changes, setChanges] = useState<FileChange[]>([])
  const isFlexible = width === undefined

  const refresh = useCallback(async () => {
    setChanges(await window.kvcode.listChanges())
  }, [])

  useEffect(() => {
    void refresh()
    return window.kvcode.onChangesUpdated(() => void refresh())
  }, [refresh])

  async function revert(id: string) {
    const path = await window.kvcode.revertChange(id)
    await useEditorStore.getState().refreshFile(path)
  }

  return (
    <section
      className={isFlexible ? `${styles.panel} ${styles.flexible}` : styles.panel}
      style={isFlexible ? undefined : { width }}
    >
      <div className={styles.header}>
        <span className={styles.title}>Diff</span>
        {changes.length > 0 ? (
          <button type="button" className={styles.clear} onClick={() => void window.kvcode.clearChanges()}>
            Clear
          </button>
        ) : null}
      </div>

      <div className={styles.body}>
        {changes.length === 0 ? <div className={styles.empty}>No changes yet</div> : null}

        {changes.map((change) => (
          <div key={change.id} className={styles.change}>
            <div className={styles.fileRow}>
              <span className={styles.name} title={change.path}>
                {basename(change.path)}
              </span>
              <span className={styles.added}>{`+${change.added}`}</span>
              <span className={styles.removed}>{`-${change.removed}`}</span>
              {change.reverted ? (
                <span className={styles.reverted}>Reverted</span>
              ) : (
                <button type="button" className={styles.revert} onClick={() => void revert(change.id)}>
                  Revert
                </button>
              )}
            </div>

            <div className={styles.lines}>
              {change.lines.map((line, index) => {
                if (line.kind === 'gap') {
                  return (
                    <div key={index} className={styles.gap}>
                      {`${line.count} unchanged`}
                    </div>
                  )
                }

                return (
                  <div key={index} className={`${styles.line} ${styles[line.kind]}`}>
                    <span className={styles.gutter}>{line.before || ''}</span>
                    <span className={styles.gutter}>{line.after || ''}</span>
                    <span className={styles.text}>{line.text}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
