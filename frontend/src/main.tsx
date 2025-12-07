import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Workbox } from 'workbox-window'
import './styles/index.css'
import App from './App.tsx'

// Register service worker for PWA (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const wb = new Workbox('/sw.js')

      // Show update prompt when new version is available
      wb.addEventListener('waiting', () => {
        if (confirm('A new version of OptionList is available. Reload to update?')) {
          wb.messageSkipWaiting()
          window.location.reload()
        }
      })

      await wb.register()
      console.log('[App] Service worker registered successfully')
    } catch (error) {
      console.error('[App] Service worker registration failed:', error)
    }
  })
}

import { AuthProvider } from 'react-oidc-context';

const oidcConfig = {
  authority: "http://localhost:8080/realms/agristack",
  client_id: "agristack-frontend",
  redirect_uri: window.location.origin,
  onSigninCallback: () => {
    // Remove query string parameters (code, state) from URL after signin
    window.history.replaceState({}, document.title, window.location.pathname);
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...oidcConfig}>
      <App />
    </AuthProvider>
  </StrictMode>,
)

