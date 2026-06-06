'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LoadingButton } from '@/components/LoadingButton'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { formatDateTime } from '@/lib/formatters'

interface Student {
  id: string
  full_name: string
  username: string | null
  teacher_feedback?: string | null
  feedback_updated_at?: string | null
}

export default function ManageStudentsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [students, setStudents] = useState<Student[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Manage Students | CSLearn'
  }, [])

  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('')

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newFullName, setNewFullName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Edit form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  // Feedback state
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({})
  const [savingFeedback, setSavingFeedback] = useState<Record<string, boolean>>({})
  const [lastSavedFeedback, setLastSavedFeedback] = useState<Record<string, string>>({})
  const feedbackTimers = useRef<Record<string, NodeJS.Timeout>>({})

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean
    studentId: string
    studentName: string
  }>({ open: false, studentId: '', studentName: '' })

  // Filtered students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students
    const query = searchQuery.toLowerCase().trim()
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(query) ||
        (s.username && s.username.toLowerCase().includes(query)),
    )
  }, [students, searchQuery])

  // Auto-save feedback with 2-second debounce
  const handleFeedbackChange = (studentId: string, value: string) => {
    setFeedbackText((prev) => ({ ...prev, [studentId]: value }))

    // Clear existing timer for this student
    if (feedbackTimers.current[studentId]) {
      clearTimeout(feedbackTimers.current[studentId])
    }

    // Set new debounced save
    feedbackTimers.current[studentId] = setTimeout(() => {
      if (value !== (lastSavedFeedback[studentId] || '')) {
        saveFeedback(studentId)
        setLastSavedFeedback((prev) => ({ ...prev, [studentId]: value }))
      }
    }, 2000)
  }

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = feedbackTimers.current
    return () => {
      Object.values(timers).forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const abortRef = useRef<AbortController | null>(null)

  const loadStudents = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setPageLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Get teacher's org
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from('profiles') as any)
      .select('organization_id')
      .eq('id', user.id)
      .limit(1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teacherProfile = (profile as any[] | null)?.[0]
    if (!teacherProfile?.organization_id) {
      setPageLoading(false)
      return
    }

    setOrgId(teacherProfile.organization_id)

    // Fetch students in same org
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: studentData } = await (supabase.from('profiles') as any)
      .select('id, full_name, username, teacher_feedback, feedback_updated_at')
      .eq('role', 'student')
      .eq('organization_id', teacherProfile.organization_id)
      .order('full_name', { ascending: true })

    const studentsList = (studentData || []) as Student[]
    setStudents(studentsList)

    // Initialise feedback text
    const feedbackMap: Record<string, string> = {}
    for (const s of studentsList) {
      feedbackMap[s.id] = s.teacher_feedback || ''
    }
    setFeedbackText(feedbackMap)

    setPageLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadStudents()

    // Polling fallback every 8s
    const interval = setInterval(loadStudents, 8000)

    // Supabase Realtime subscription
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null
    try {
      channel = supabase
        .channel('teacher-students-live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          () => { loadStudents() },
        )
        .subscribe()
    } catch {
      // Realtime unavailable — polling handles it
    }

    return () => {
      if (abortRef.current) abortRef.current.abort()
      clearInterval(interval)
      if (channel) supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadStudents])

  async function saveFeedback(studentId: string) {
    setSavingFeedback((prev) => ({ ...prev, [studentId]: true }))
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/teacher-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          feedback: feedbackText[studentId] || '',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save feedback')
      } else {
        setSuccess('Feedback saved!')
        // Update local state
        setStudents((prev) =>
          prev.map((s) =>
            s.id === studentId
              ? { ...s, teacher_feedback: feedbackText[studentId] || '', feedback_updated_at: new Date().toISOString() }
              : s
          )
        )
      }
    } catch {
      setError('Failed to save feedback')
    }
    setSavingFeedback((prev) => ({ ...prev, [studentId]: false }))
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          orgId,
          username: newUsername.trim(),
          password: newPassword,
          fullName: newFullName.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create student')
        setSubmitting(false)
        return
      }

      setSuccess(`Student "${newFullName.trim()}" created successfully!`)
      setShowAddForm(false)
      setNewUsername('')
      setNewFullName('')
      setNewPassword('')
      loadStudents()
    } catch {
      setError('Failed to create student')
    }
    setSubmitting(false)
  }

  async function handleEditStudent(studentId: string) {
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          studentId,
          fullName: editName.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to update student')
        setSubmitting(false)
        return
      }

      setSuccess('Student updated successfully!')
      setEditingId(null)
      setEditName('')
      loadStudents()
    } catch {
      setError('Failed to update student')
    }
    setSubmitting(false)
  }

  async function handleDeleteStudent() {
    const { studentId, studentName } = deleteConfirm
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          studentId,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete student')
        setSubmitting(false)
        setDeleteConfirm({ open: false, studentId: '', studentName: '' })
        return
      }

      setSuccess(`Student "${studentName}" deleted.`)
      setDeleteConfirm({ open: false, studentId: '', studentName: '' })
      loadStudents()
    } catch {
      setError('Failed to delete student')
    }
    setSubmitting(false)
  }

  if (pageLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-44 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="h-9 w-28 animate-pulse rounded-md bg-gray-200" />
        </div>
        <div className="animate-pulse rounded-lg border bg-white shadow-sm overflow-hidden">
          <div className="space-y-4 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Students</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create, edit, and remove student accounts. Add feedback that students can see on their dashboard.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowAddForm(!showAddForm); setError(null); setSuccess(null) }}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          {showAddForm ? 'Cancel' : '+ Add Student'}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>
      )}

      {/* Add Student Form */}
      {showAddForm && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Student</h2>
          <form onSubmit={handleAddStudent} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="new-username" className="block text-sm font-medium text-gray-700">Username</label>
              <input
                id="new-username"
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm text-gray-900"
                placeholder="e.g. johndoe"
              />
            </div>
            <div>
              <label htmlFor="new-fullname" className="block text-sm font-medium text-gray-700">Full name</label>
              <input
                id="new-fullname"
                type="text"
                required
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm text-gray-900"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="new-password"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm text-gray-900"
                placeholder="••••••••"
              />
            </div>
            <LoadingButton
              type="submit"
              loading={submitting}
              loadingText="Creating..."
              className="bg-accent hover:bg-accent-hover"
            >
              Create Student
            </LoadingButton>
          </form>
        </div>
      )}

      {/* Search/Filter bar */}
      {students.length > 0 && (
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
            placeholder="Search students by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-accent focus:outline-none focus:ring-accent"
          />
        </div>
      )}

      {/* Students Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {students.length === 0 ? (
          <EmptyState
            title="No students yet"
            description='Click "+ Add Student" to create your first student account.'
          />
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            variant="filtered"
            title="No students match your search"
            description={`No results found for "${searchQuery}". Try a different name or username.`}
          />
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredStudents.map((student) => (
              <Link
                key={student.id}
                href={`/teacher/students/${student.id}`}
                className="block px-6 py-4 transition-all hover:bg-gray-50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-bg text-sm font-bold text-accent">
                      {student.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      {editingId === student.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-accent focus:outline-none focus:ring-accent"
                          />
                          <button
                            type="button"
                            onClick={() => handleEditStudent(student.id)}
                            disabled={submitting}
                            className="text-sm font-medium text-green-600 hover:text-green-800"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="text-sm font-medium text-gray-500 hover:text-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-gray-900">{student.full_name}</p>
                          <p className="text-xs text-gray-500">@{student.username || '-'}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setEditingId(student.id); setEditName(student.full_name); setError(null); setSuccess(null) }}
                      className="text-sm font-medium text-accent hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        setDeleteConfirm({ open: true, studentId: student.id, studentName: student.full_name })
                      }}
                      disabled={submitting}
                      className="text-sm font-medium text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Teacher Feedback */}
                <div className="mt-3 ml-13 pl-13">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Teacher Feedback (visible to student)
                  </label>
                  <div className="flex gap-2">
                    <textarea
                      value={feedbackText[student.id] || ''}
                      onChange={(e) => handleFeedbackChange(student.id, e.target.value)}
                      rows={2}
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="Write feedback for this student..."
                    />
                    <LoadingButton
                      type="button"
                      onClick={() => saveFeedback(student.id)}
                      loading={!!savingFeedback[student.id]}
                      loadingText="Saving..."
                      className="self-start bg-accent hover:bg-accent-hover px-3 py-2 text-xs whitespace-nowrap"
                    >
                      {savingFeedback[student.id] ? 'Saving...' : 'Save'}
                    </LoadingButton>
                  </div>
                  {student.teacher_feedback && (
                    <p className="mt-1 text-xs text-gray-400">
                      Last saved: {formatDateTime(student.feedback_updated_at)}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Student"
        message={
          <>
            Are you sure you want to delete <strong>{deleteConfirm.studentName}</strong>?
            <br />
            <span className="text-red-500">This action cannot be undone.</span>
          </>
        }
        confirmLabel="Delete"
        variant="danger"
        loading={submitting}
        onConfirm={handleDeleteStudent}
        onCancel={() => setDeleteConfirm({ open: false, studentId: '', studentName: '' })}
      />
    </div>
  )
}
