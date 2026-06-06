'use client'

import { useOffline } from '@/hooks/useOffline'

export default function OfflineBanner() {
  const isOffline = useOffline()

  if (!isOffline) return null

  return (
    <div className="sticky top-0 z-50 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white shadow-md">
      <div className="flex items-center justify-center gap-2">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 010-1.414m-4.243 1.414a1 1 0 010-1.414"
          />
        </svg>
        <span>You are offline. Some features may be unavailable.</span>
      </div>
    </div>
  )
}
