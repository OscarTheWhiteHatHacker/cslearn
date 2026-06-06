'use client'

import { Button } from '@/components/ui/Button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="bg-white">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          {/* Branded error illustration */}
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-red-50 to-red-100 shadow-inner">
            <svg className="h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Critical Error
          </h1>

          <p className="mt-3 text-base leading-relaxed text-gray-500 max-w-md text-center">
            A critical error occurred and the application could not recover.
            Please try refreshing the page.
          </p>

          {error.digest && (
            <p className="mt-2 text-xs text-gray-400 font-mono">
              Error ID: {error.digest}
            </p>
          )}

          <div className="mt-8 flex items-center justify-center gap-4">
            <Button type="button" onClick={reset}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try again
            </Button>
          </div>

          <p className="mt-6 text-xs text-gray-400">
            If this keeps happening, contact support.
          </p>
        </div>
      </body>
    </html>
  )
}
