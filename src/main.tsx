import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => registration.unregister())
      }).catch(() => undefined)
      if ('caches' in window) {
        caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('lashly-')).map(key => caches.delete(key)))).catch(() => undefined)
      }
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(() => undefined)
  })
}
