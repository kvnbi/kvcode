import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './components/App'
import '@renderer/state/chatStore'
import '@renderer/state/permissionStore'
import './styles/global.css'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root container is missing')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
)
