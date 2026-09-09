import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { AuthProvider } from './features/auth/AuthProvider'
import { ConfirmProvider } from './components/ConfirmProvider'
import './styles/global.css'

document.documentElement.dataset.theme = 'light'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ConfirmProvider><App /></ConfirmProvider>
    </AuthProvider>
  </StrictMode>,
)
