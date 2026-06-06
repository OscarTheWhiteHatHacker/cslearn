'use client'

import { useState } from 'react'

type ReleaseToggleProps = {
  subtopicId: string
  initiallyReleased: boolean
}

export default function ReleaseToggle({ subtopicId, initiallyReleased }: ReleaseToggleProps) {
  const [released, setReleased] = useState(initiallyReleased)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleRelease = async () => {
    setLoading(true)
    setError(null)

    // Optimistic update
    const previousReleased = released
    setReleased(!released)

    try {
      const action = released ? 'unrelease' : 'release'
      const response = await fetch('/api/release-subtopic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtopicId, action }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        // Revert optimistic update
        setReleased(previousReleased)
        setError(errorData.error || 'Failed to toggle release. Please try again.')
        return
      }

      const result = await response.json()
      setReleased(result.released)
    } catch (err) {
      // Revert optimistic update on network error
      setReleased(previousReleased)
      setError('Network error toggling release. Please check your connection and try again.')
      console.error('Network error toggling release:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        onClick={toggleRelease}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
          released
            ? 'bg-green-100 text-green-800 hover:bg-green-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : released ? (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}
        {released ? 'Released' : 'Not released'}
      </button>
      {error && (
        <p className="text-xs text-red-600 ml-1">{error}</p>
      )}
    </div>
  )
}
