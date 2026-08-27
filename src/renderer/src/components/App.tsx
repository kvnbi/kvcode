import { useEffect } from 'react'
import { useEditorStore } from '@renderer/state/editorStore'
import { EditorPane } from './EditorPane'
import { Sidebar } from './Sidebar'
import { TitleBar } from './TitleBar'
import styles from './App.module.css'

export function App() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.metaKey && !event.ctrlKey) return

      const key = event.key.toLowerCase()

      if (key !== 's' && key !== 'o') return

      event.preventDefault()
      const store = useEditorStore.getState()
      void (key === 's' ? store.save() : store.openFolders())
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className={styles.shell}>
      <TitleBar />
      <div className={styles.body}>
        <Sidebar />
        <main className={styles.workArea}>
          <EditorPane />
        </main>
      </div>
    </div>
  )
}
