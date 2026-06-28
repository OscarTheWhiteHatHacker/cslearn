'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface StudentInfo {
  id: string
  full_name: string
  username: string | null
}

type ReleaseMode = 'all' | 'specific'

interface StudentReleaseModalProps {
  /** The API endpoint to call for fetching/saving release state */
  apiEndpoint: string
  /** The ID of the content being released (lesson_id or subtopic_id) */
  contentId: string
  /** The org ID for fetching student list */
  orgId: string
  /** Called when modal closes */
  onClose: () => void
  /** Called after save completes — parent can refresh release state */
  onSaved?: () => void
}

export default function StudentReleaseModal({
  apiEndpoint,
  contentId,
  orgId,
  onClose,
  onSaved,
}: StudentReleaseModalProps) {
  const supabase = createClient()

  // Student list
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)

  // Current release state
  const [mode, setMode] = useState<ReleaseMode>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load students + current release state on mount
  useEffect(() => {
    let cancelled = false

    async function load() {
      // Fetch students in the org
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s: any = supabase
      const { data: studentData } = await (s as any)
        .from('profiles')
        .select('id, full_name, username')
        .eq('role', 'student')
        .eq('organization_id', orgId)
        .order('full_name', { ascending: true })

      if (cancelled) return
      const studentList = (studentData || []) as StudentInfo[]
      setStudents(studentList)

      // Fetch current release state for this content
      try {
        const res = await fetch(`${apiEndpoint}?${new URLSearchParams({ contentId })}`)
        if (res.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data: any = await res.json()
          if (!cancelled) {
            if (data.releaseAll) {
              setMode('all')
              setSelectedIds(new Set(data.studentIds || []))
            } else {
              const ids = new Set<string>(data.studentIds || [])
              setMode(ids.size > 0 ? 'specific' : 'all')
              setSelectedIds(ids)
            }
          }
        }
      } catch {
        // Use defaults
      }

      if (!cancelled) setLoadingStudents(false)
    }

    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, orgId])

  // Filtered student list
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students
    const q = searchQuery.toLowerCase()
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        (s.username && s.username.toLowerCase().includes(q))
    )
  }, [students, searchQuery])

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (filteredStudents.every((s) => selectedIds.has(s.id))) {
      // Deselect all visible
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const s of filteredStudents) next.delete(s.id)
        return next
      })
    } else {
      // Select all visible
      setSelectedIds((prev) => {
        const next = new Set(prev)
        for (const s of filteredStudents) next.add(s.id)
        return next
      })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const body = {
        action: mode === 'all' ? 'release' : 'release',
        [apiEndpoint.includes('subtopic') ? 'subtopicId' : 'lessonId']: contentId,
        releaseAll: mode === 'all',
        studentIds: mode === 'specific' ? Array.from(selectedIds) : [],
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errData = await response.json()
        setError(errData.error || 'Failed to save release settings')
        setSaving(false)
        return
      }

      onSaved?.()
      onClose()
    } catch {
      setError('Network error saving release settings')
    } finally {
      setSaving(false)
    }
  }

  const handleUnrelease = async () => {
    setSaving(true)
    setError(null)

    try {
      const body = {
        action: 'unrelease',
        [apiEndpoint.includes('subtopic') ? 'subtopicId' : 'lessonId']: contentId,
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errData = await response.json()
        setError(errData.error || 'Failed to unrelease')
        setSaving(false)
        return
      }

      onSaved?.()
      onClose()
    } catch {
      setError('Network error unreleasing')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Student Access</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Mode selector */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('all')}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                mode === 'all'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                All students
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode('specific')}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                mode === 'specific'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Specific students
              </div>
            </button>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {loadingStudents ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : mode === 'specific' ? (
            <>
              {/* Search */}
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-accent focus:outline-none focus:ring-accent"
                />
              </div>

              {/* Select all / Count */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-accent hover:text-accent-hover font-medium"
                >
                  {filteredStudents.every((s) => selectedIds.has(s.id))
                    ? 'Deselect all'
                    : 'Select all'}
                </button>
                <span>
                  {selectedIds.size} of {students.length} selected
                </span>
              </div>

              {/* Student list */}
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-1">
                {filteredStudents.length === 0 ? (
                  <p className="py-6 text-center text-sm text-gray-400">No students match your search</p>
                ) : (
                  filteredStudents.map((student) => (
                    <label
                      key={student.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{student.full_name}</p>
                        {student.username && (
                          <p className="text-xs text-gray-500 truncate">@{student.username}</p>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-gray-500 py-4">
              Content will be visible to all students in your organisation.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <button
            type="button"
            onClick={handleUnrelease}
            disabled={saving}
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Unrelease
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || (mode === 'specific' && selectedIds.size === 0)}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
