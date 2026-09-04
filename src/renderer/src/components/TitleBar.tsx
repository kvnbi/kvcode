import { PANELS, useLayoutStore } from '@renderer/state/layoutStore'
import type { PanelId } from '@renderer/state/layoutStore'
import { SidebarIcon } from './Icons'
import styles from './TitleBar.module.css'

const LABELS: Record<PanelId, string> = {
  code: 'Code',
  diff: 'Diff',
  output: 'Output',
  browser: 'Browser',
  terminal: 'Terminal'
}

interface TitleBarProps {
  sidebarHidden: boolean
  onToggleSidebar: () => void
}

export function TitleBar({ sidebarHidden, onToggleSidebar }: TitleBarProps) {
  const open = useLayoutStore((state) => state.open)
  const togglePanel = useLayoutStore((state) => state.togglePanel)
  const shift = sidebarHidden && window.kvcode.platform === 'darwin'

  return (
    <header className={shift ? `${styles.bar} ${styles.barShift}` : styles.bar}>
      {sidebarHidden ? (
        <button
          type="button"
          className={styles.collapse}
          title="Show sidebar"
          onClick={onToggleSidebar}
        >
          <SidebarIcon size={15} />
        </button>
      ) : null}

      <div className={styles.brand}>KVCode</div>

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
