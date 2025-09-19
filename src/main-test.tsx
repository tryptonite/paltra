import React from 'react'
import ReactDOM from 'react-dom/client'
import '@/index.css'

// Simple test component without AuthContext
function TestApp(): React.JSX.Element {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Test App Loading</h1>
      <p>If you can see this, React is working!</p>
      <p>Time: {new Date().toLocaleString()}</p>
    </div>
  )
}

const rootElement = document.getElementById('root') as HTMLElement | null

if (!rootElement) {
  throw new Error('Root element with id "root" not found in document.')
}

ReactDOM.createRoot(rootElement).render(<TestApp />)
