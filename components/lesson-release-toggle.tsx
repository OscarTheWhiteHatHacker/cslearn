'use client'

import { useState } from 'react'
import StudentReleaseModal from './student-release-modal'

type LessonReleaseToggleProps = {
  lessonId: string
  initiallyReleased: boolean
  /** The teacher/org_admin's org_id — needed for the student picker */
  orgId: string
}

export default function LessonReleaseToggle({ lessonId, initiallyReleased, orgId }: LessonReleaseToggleProps) {
  const [released, setReleased] = useState(initiallyReleased)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [studentCount, setStudentCount] = useState<number | null>(null)

  const toggleRelease = async () => {
    setLoading(true)
    setError(null)

    // Optimistic update
    const previousReleased = released
    setReleased(!released)

    try {
      const action = released ? 'unrelease' : 'release'
      const response = await fetch('/api/release-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, action }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        // Revert optimistic update
        setReleased(previousReleased)
        setError(errorData.error || 'Failed to toggle lesson release. Please try again.')
        return
      }

      const result = await response.json()
      setReleased(result.released)
      if (!result.released) {
        setStudentCount(null)
      } else {
        setStudentCount(result.releaseAll ? null : result.studentIds?.length || null)
      }
    } catch (err) {
      // Revert optimistic update on network error
      setReleased(previousReleased)
      setError('Network error toggling lesson release. Please check your connection and try again.')
      console.error('Network error toggling lesson release:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaved = async () => {
    // Refresh release state after modal save
    try {
      const res = await fetch(`/api/release-lesson?contentId=${lessonId}`)
      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await res.json()
        setReleased(data.released)
        setStudentCount(data.releaseAll ? null : data.studentIds?.length || null)
      }
    } catch {
      // Best-effort refresh
    }
  }

  return (
    <>
      <div className="inline-flex flex-col items-start gap-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleRelease}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              released
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : released ? (
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
            {released ? 'Released' : 'Not released'}
          </button>

          {/* Student picker trigger — only shown when released */}
          {released && orgId && (
            <button
              type="button"
              onClick={() => setShowStudentModal(true)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              title="Manage which students can see this lesson"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              {studentCount !== null ? `${studentCount} students` : 'All students'}
            </button>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-600 ml-1">{error}</p>
        )}
      </div>

      {/* Student release modal */}
      {showStudentModal && (
        <StudentReleaseModal
          apiEndpoint="/api/release-lesson"
          contentId={lessonId}
          orgId={orgId}
          onClose={() => setShowStudentModal(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
