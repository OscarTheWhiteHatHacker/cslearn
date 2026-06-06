'use client'

import { useEffect, useState } from 'react'

export function useOffline() {
  // Always assume online initially to avoid SSR/hydration flash
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Check actual status after mount (avoids SSR/hydration race)
    setIsOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false)

    function handleOffline() {
      setIsOffline(true)
    }
    function handleOnline() {
      setIsOffline(false)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return isOffline
}
