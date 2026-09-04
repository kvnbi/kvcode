import { Fragment, Suspense, lazy, useEffect, useState } from 'react'
import { useEditorStore } from '@renderer/state/editorStore'
import { SIDEBAR_BREAKPOINT, fitLayout, flexPanel, openPanels, useLayoutStore } from '@renderer/state/layoutStore'
import type { PanelId } from '@renderer/state/layoutStore'
import { ChatList } from './ChatList'
import { CodePanel } from './CodePanel'
import { Divider } from './Divider'
import { DiffPanel } from './DiffPanel'
import { PromptPanel } from './PromptPanel'
import { Settings } from './Settings'
import { Panel } from './Panel'
import { TitleBar } from './TitleBar'
import styles from './App.module.css'

const TerminalPanel = lazy(() =>
  import('./TerminalPanel').then((module) => ({ default: module.TerminalPanel }))
)

const TITLES: Record<PanelId, string> = {
  code: 'Code',
  diff: 'Diff',
  output: 'Output',
  browser: 'Browser',
  terminal: 'Terminal'
}

function useHydrated(): boolean {
  const [ready, setReady] = useState(() => useLayoutStore.persist.hasHydrated())

  useEffect(() => useLayoutStore.persist.onFinishHydration(() => setReady(true)), [])

  return ready
}

function useViewportWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return width
}

export function App() {
  const chatWidth = useLayoutStore((state) => state.chatWidth)
  const widths = useLayoutStore((state) => state.widths)
  const open = useLayoutStore((state) => state.open)
  const sidebarCollapsed = useLayoutStore((state) => state.sidebarCollapsed)
  const setSidebarCollapsed = useLayoutStore((state) => state.setSidebarCollapsed)
  const resizeChat = useLayoutStore((state) => state.resizeChat)
  const resizePanel = useLayoutStore((state) => state.resizePanel)
  const viewport = useViewportWidth()
  const hydrated = useHydrated()
  const [showSettings, setShowSettings] = useState(false)
  const sidebarHidden = sidebarCollapsed || viewport < SIDEBAR_BREAKPOINT

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

  const fitted = fitLayout(chatWidth, widths, open, viewport, sidebarHidden ? 0 : undefined)
  const panels = openPanels(open)
  const flexId = flexPanel(open)
  const flexPosition = flexId ? panels.indexOf(flexId) + 1 : 0

  function onDividerResize(index: number, delta: number) {
    if (index < flexPosition) {
      if (index === 0) resizeChat(delta)
      else resizePanel(panels[index - 1], delta)
      return
    }

    resizePanel(panels[index], -delta)
  }

  function widthFor(id: PanelId): number | undefined {
    return id === flexId ? undefined : fitted.widths[id]
  }

  if (!hydrated) return null

  return (
    <div className={styles.shell}>
      {sidebarHidden ? null : (
        <ChatList
          onOpenSettings={() => setShowSettings(true)}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarHidden)}
        />
      )}
      <div className={styles.content}>
        <TitleBar sidebarHidden={sidebarHidden} onToggleSidebar={() => setSidebarCollapsed(!sidebarHidden)} />
        <div className={styles.body}>
          <PromptPanel width={flexPosition === 0 ? undefined : fitted.chatWidth} />
          {panels.map((id, index) => (
            <Fragment key={id}>
              <Divider label={`Resize ${TITLES[id]} panel`} onResize={(delta) => onDividerResize(index, delta)} />
              {id === 'code' ? <CodePanel width={widthFor(id)} /> : null}
              {id === 'diff' ? <DiffPanel width={widthFor(id)} /> : null}
              {id === 'terminal' ? (
                <Suspense fallback={null}>
                  <TerminalPanel width={widthFor(id)} />
                </Suspense>
              ) : null}
              {id !== 'code' && id !== 'diff' && id !== 'terminal' ? (
                <Panel title={TITLES[id]} width={widthFor(id)} />
              ) : null}
            </Fragment>
          ))}
        </div>
      </div>
      {showSettings ? <Settings onClose={() => setShowSettings(false)} /> : null}
    </div>
  )
}
