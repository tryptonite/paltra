import React from 'react'
import './App.css'
import { Toaster } from '@/components/ui/toaster'

function App(): React.JSX.Element {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Paltra Warehouse Portal</h1>
      <p>Test App - If you can see this, React is working!</p>
      <p>Time: {new Date().toLocaleString()}</p>
      <Toaster />
    </div>
  )
}

export default App
