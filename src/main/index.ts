import { app, BrowserWindow } from 'electron'
import { registerIpcHandlers } from './ipc'
import { flushLayout } from './services/settings'
import { disposeTerminals } from './services/terminals'
import { createMainWindow } from './window'

app.whenReady().then(() => {
  registerIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('before-quit', () => {
  flushLayout()
  disposeTerminals()
})

app.on('will-quit', disposeTerminals)

app.on('window-all-closed', () => {
  flushLayout()
  disposeTerminals()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
  process.on(signal, () => {
    flushLayout()
    disposeTerminals()
    app.exit(0)
  })
}
