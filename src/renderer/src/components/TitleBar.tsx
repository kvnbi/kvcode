import { PANELS, useLayoutStore } from '@renderer/state/layoutStore'
import type { PanelId } from '@renderer/state/layoutStore'
import styles from './TitleBar.module.css'

const LABELS: Record<PanelId, string> = {
  code: 'Code',
  diff: 'Diff',
  output: 'Output',
  browser: 'Browser',
  terminal: 'Terminal'
}

export function TitleBar() {
  const open = useLayoutStore((state) => state.open)
  const togglePanel = useLayoutStore((state) => state.togglePanel)

  return (
    <header className={styles.bar}>
      <div className={styles.brand}>KVCODE</div>

      <div className={styles.toggles}>
        {PANELS.map((id) => (
          <button
            key={id}
            type="button"
            className={open[id] ? `${styles.toggle} ${styles.toggleOn}` : styles.toggle}
            aria-pressed={open[id]}
            onClick={() => togglePanel(id)}
          >
            {LABELS[id]}
          </button>
        ))}
      </div>

    </header>
  )
}
