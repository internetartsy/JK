import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from 'react-oidc-context'
import './index.css'
import App from './App.tsx'

const oidcConfig = {
  authority: "http://localhost:8080/realms/agristack",
  client_id: "agristack-frontend",
  redirect_uri: window.location.origin,
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname)
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...oidcConfig}>
      <App />
    </AuthProvider>
  </StrictMode>,
)
