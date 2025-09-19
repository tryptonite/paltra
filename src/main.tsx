import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'
import '@/index.css'

const rootElement = document.getElementById('root') as HTMLElement | null

if (!rootElement) {
  throw new Error('Root element with id "root" not found in document.')
}

ReactDOM.createRoot(rootElement).render(
  <AuthProvider>
    <App />
  </AuthProvider>
)
