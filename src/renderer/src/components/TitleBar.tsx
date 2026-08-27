import { selectIsDirty, useEditorStore } from '@renderer/state/editorStore'
import { FolderIcon, SaveIcon } from './Icons'
import styles from './TitleBar.module.css'

export function TitleBar() {
  const isDirty = useEditorStore(selectIsDirty)
  const isSaving = useEditorStore((state) => state.isSaving)
  const openFolders = useEditorStore((state) => state.openFolders)
  const save = useEditorStore((state) => state.save)
  const isMac = window.kvcode.platform === 'darwin'

  return (
    <header className={styles.bar}>
      {isMac ? <div className={styles.macSpacer} /> : null}

      <div className={styles.brand}>KVCODE</div>

      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={openFolders}>
          <FolderIcon size={13} />
          Open Folder
        </button>
        <button
          type="button"
          className={styles.primary}
          onClick={save}
          disabled={!isDirty || isSaving}
        >
          <SaveIcon size={13} />
          {isSaving ? 'Saving' : 'Save'}
        </button>
      </div>
    </header>
  )
}
