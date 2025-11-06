"use client"
import { SessionProvider } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { AudioPlayerProvider } from '@/contexts/AudioPlayerContext'

function PresencePing() {
  const { data: session } = useSession()
  const hasPingedRef = useRef(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    if (!session?.user) {
      // Clear interval if user logs out
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      hasPingedRef.current = false
      return
    }
    
    // Only set up ping once per session
    if (hasPingedRef.current) return
    hasPingedRef.current = true
    
    const ping = async () => {
      try { 
        await fetch('/api/presence', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            currentPage: window.location.pathname,
            pageType: 'music',
            mediaType: null
          })
        }) 
      } catch {}
    }
    
    ping()
    intervalRef.current = setInterval(ping, 60000) // 60 seconds
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      hasPingedRef.current = false
    }
  }, [session?.user?.email]) // Only depend on email, not entire session object
  
  return null
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AudioPlayerProvider>
        <PresencePing />
        {children}
      </AudioPlayerProvider>
    </SessionProvider>
  )
}

