import { app, BrowserWindow } from 'electron'
import { registerIpcHandlers } from './ipc'
import { flushLayout } from './services/settings'
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

app.on('before-quit', flushLayout)

app.on('window-all-closed', () => {
  flushLayout()

  if (process.platform !== 'darwin') {
    app.quit()
  }
})
