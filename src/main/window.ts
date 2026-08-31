import { join } from 'node:path'
import { app, BrowserWindow, shell } from 'electron'

const isMac = process.platform === 'darwin'
const MOUNT_GRACE = 700

function isExternalWebUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 600,
    show: false,
    backgroundColor: isMac ? '#00000000' : '#1a1a1a',
    vibrancy: isMac ? 'under-window' : undefined,
    visualEffectState: 'active',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 18, y: 20 } : undefined,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  window.on('ready-to-show', () => window.show())

  window.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      if (window.isDestroyed()) return

      window.webContents
        .executeJavaScript('document.getElementById("root")?.childElementCount ?? 0')
        .then((mounted: number) => {
          if (mounted === 0 && !window.isDestroyed()) window.webContents.reload()
        })
        .catch(() => undefined)
    }, MOUNT_GRACE)
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalWebUrl(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault()
  })

  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false)
  })

  const devServerUrl = process.env['ELECTRON_RENDERER_URL']

  if (!app.isPackaged && devServerUrl) {
    window.loadURL(devServerUrl)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}
