import React from 'react'
import './App.css'
import Pages from '@/pages'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/components/ui/use-toast'

function App(): React.JSX.Element {
  const { toast } = useToast()

  React.useEffect(() => {
    const handleUserRemoved = (event: CustomEvent) => {
      toast({
        title: "Account Removed",
        description: event.detail.message,
        variant: "destructive",
        duration: 5000,
      })
    }

    window.addEventListener('user-removed', handleUserRemoved as EventListener)
    
    return () => {
      window.removeEventListener('user-removed', handleUserRemoved as EventListener)
    }
  }, [toast])

  return (
    <>
      <Pages />
      <Toaster />
    </>
  )
}

export default App
