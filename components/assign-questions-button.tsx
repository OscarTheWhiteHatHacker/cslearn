'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/formatters'

interface Question {
  question: string
  marks: number
  mark_scheme: string
}

interface QuestionSet {
  id: string
  subtopic_id: string
  teacher_id: string
  questions_json: Question[]
  status: 'draft' | 'published'
  created_at: string
}

interface AssignQuestionsButtonProps {
  subtopicId: string
  lessonIndex?: number
  orgId?: string
}

export default function AssignQuestionsButton({ subtopicId, lessonIndex, orgId }: AssignQuestionsButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [draftSets, setDraftSets] = useState<QuestionSet[]>([])
  const [publishedSets, setPublishedSets] = useState<QuestionSet[]>([])
  const [editingSet, setEditingSet] = useState<QuestionSet | null>(null)
  const [editingQuestions, setEditingQuestions] = useState<Question[]>([])
  const [showDrafts, setShowDrafts] = useState(false)
  const [showStudentModal, setShowStudentModal] = useState(false)

  useEffect(() => {
    loadQuestionSets()
  }, [subtopicId])

  const loadQuestionSets = async () => {
    try {
      const [draftRes, publishedRes] = await Promise.all([
        fetch(`/api/question-set?subtopicId=${subtopicId}&status=draft`),
        fetch(`/api/question-set?subtopicId=${subtopicId}&status=published`),
      ])
      if (draftRes.ok) {
        const d = await draftRes.json()
        setDraftSets(d.questionSets || [])
      }
      if (publishedRes.ok) {
        const p = await publishedRes.json()
        setPublishedSets(p.questionSets || [])
      }
    } catch {
      // silent
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtopicId, lessonIndex }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to generate questions')
      }
      const parsedQuestions = (data.questionSet?.questions_json || []) as Question[]
      setEditingQuestions(parsedQuestions)
      setEditingSet(data.questionSet)
      setSuccess('Questions generated! Review and edit them below, then click Assign.')
      await loadQuestionSets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions')
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (set: QuestionSet) => {
    setEditingSet(set)
    setEditingQuestions([...set.questions_json])
    setError('')
    setSuccess('')
    setShowDrafts(false)
  }

  const cancelEditing = () => {
    setEditingSet(null)
    setEditingQuestions([])
    setError('')
    setSuccess('')
  }

  const updateQuestion = (index: number, field: 'question' | 'marks' | 'mark_scheme', value: string | number) => {
    const updated = [...editingQuestions]
    updated[index] = { ...updated[index], [field]: value }
    setEditingQuestions(updated)
  }

  const removeQuestion = (index: number) => {
    setEditingQuestions(editingQuestions.filter((_, i) => i !== index))
  }

  const addQuestion = () => {
    setEditingQuestions([...editingQuestions, { question: '', marks: 2, mark_scheme: '' }])
  }

  const validate = () => {
    for (let i = 0; i < editingQuestions.length; i++) {
      const q = editingQuestions[i]
      if (!q.question.trim()) return `Question ${i + 1} has no question text`
      if (!q.mark_scheme.trim()) return `Question ${i + 1} has no mark scheme`
      if (q.marks < 1) return `Question ${i + 1} must have at least 1 mark`
    }
    return null
  }

  const handleSave = async () => {
    if (!editingSet) return
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/question-set', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingSet.id, questions: editingQuestions }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save')
      setSuccess('Changes saved!')
      await loadQuestionSets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async (releaseAll: boolean, studentIds: string[]) => {
    if (!editingSet) return
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      // Save edits first
      const saveRes = await fetch('/api/question-set', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingSet.id, questions: editingQuestions }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save edits')

      // Then publish with student targeting
      const response = await fetch('/api/question-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingSet.id, releaseAll, studentIds }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to publish')

      setSuccess(releaseAll ? 'Questions assigned to all students!' : `Questions assigned to ${studentIds.length} student(s)!`)
      setShowStudentModal(false)
      setEditingSet(null)
      setEditingQuestions([])
      await loadQuestionSets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setLoading(false)
    }
  }

  const handleUnpublish = async () => {
    if (!editingSet) return
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/question-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingSet.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to unassign')
      setSuccess('Questions unassigned from students.')
      setEditingSet(null)
      setEditingQuestions([])
      await loadQuestionSets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unassign')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDraft = async (id: string) => {
    if (!confirm('Delete this draft question set? This cannot be undone.')) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/question-set`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete')
      }
      setSuccess('Draft deleted.')
      await loadQuestionSets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Generate button */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Working...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Generate Questions
            </>
          )}
        </button>

        {(draftSets.length > 0 || publishedSets.length > 0) && (
          <button onClick={() => setShowDrafts(!showDrafts)} className="text-sm text-blue-600 hover:text-blue-800 underline">
            {showDrafts ? 'Hide' : `View all (${draftSets.length + publishedSets.length})`}
          </button>
        )}
      </div>

      {error && <div className="rounded-md bg-red-50 border border-red-200 p-3"><p className="text-sm text-red-700">{error}</p></div>}
      {success && <div className="rounded-md bg-green-50 border border-green-200 p-3"><p className="text-sm text-green-700">{success}</p></div>}

      {/* Existing sets list */}
      {showDrafts && !editingSet && (
        <div className="space-y-3 mt-4">
          {publishedSets.map((set) => (
            <div key={set.id} className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center justify-between">
              <div>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Published</span>
                <span className="text-sm text-gray-700 ml-2">{set.questions_json.length} questions</span>
                <span className="text-xs text-gray-500 ml-2">{formatDate(set.created_at)}</span>
              </div>
              <button onClick={() => startEditing(set)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Edit / Unassign</button>
            </div>
          ))}
          {draftSets.map((set) => (
            <div key={set.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
              <div>
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Draft</span>
                <span className="text-sm text-gray-700 ml-2">{set.questions_json.length} questions</span>
                <span className="text-xs text-gray-500 ml-2">{formatDate(set.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEditing(set)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                <button onClick={() => handleDeleteDraft(set.id)} className="text-sm text-red-600 hover:text-red-800 font-medium">Delete</button>
              </div>
            </div>
          ))}
          {draftSets.length === 0 && publishedSets.length === 0 && <p className="text-sm text-gray-500">No question sets yet.</p>}
        </div>
      )}

      {/* Editing panel */}
      {editingSet && !showStudentModal && (
        <div className="mt-6 space-y-4 border border-gray-200 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Edit Questions ({editingQuestions.length})</h3>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {editingSet.status === 'published' ? 'Published' : 'Draft'}
            </span>
          </div>

          <div className="space-y-4">
            {editingQuestions.map((q, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Question {i + 1}</h4>
                  <button onClick={() => removeQuestion(i)} className="text-red-500 hover:text-red-700 text-sm font-medium">Remove</button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Question text</label>
                  <textarea value={q.question} onChange={(e) => updateQuestion(i, 'question', e.target.value)} rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent focus:ring-accent" />
                </div>
                <div className="w-20">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Marks</label>
                  <input type="number" min={1} max={20} value={q.marks}
                    onChange={(e) => updateQuestion(i, 'marks', parseInt(e.target.value) || 1)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mark scheme</label>
                  <textarea value={q.mark_scheme} onChange={(e) => updateQuestion(i, 'mark_scheme', e.target.value)} rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent focus:ring-accent" />
                </div>
              </div>
            ))}
          </div>

          <button onClick={addQuestion} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add question
          </button>

          <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
            <button onClick={handleSave} disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            {editingSet.status === 'published' ? (
              <button onClick={handleUnpublish} disabled={loading}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-all">
                {loading ? 'Working...' : 'Unassign'}
              </button>
            ) : (
              <button onClick={() => orgId ? setShowStudentModal(true) : handlePublish(true, [])}
                disabled={loading || editingQuestions.length === 0}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-all">
                {loading ? 'Working...' : 'Assign to Students'}
              </button>
            )}
            <button onClick={cancelEditing} className="text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          </div>
        </div>
      )}

      {/* Custom inline assignment modal — parent controls all API calls */}
      {showStudentModal && editingSet && orgId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowStudentModal(false)}>
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <AssignedQuestionModal
              contentId={editingSet.id}
              orgId={orgId}
              onSave={(releaseAll, studentIds) => {
                setShowStudentModal(false)
                handlePublish(releaseAll, studentIds)
              }}
              onClose={() => setShowStudentModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Inline student-picker modal for assigning question sets.
 * Parent handles all API calls — this only collects choices.
 */
function AssignedQuestionModal({
  orgId,
  onSave,
  onClose,
}: {
  contentId: string
  orgId: string
  onSave: (releaseAll: boolean, studentIds: string[]) => void
  onClose: () => void
}) {
  const [students, setStudents] = useState<Array<{ id: string; full_name: string; username: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'all' | 'specific'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, username')
        .eq('role', 'student')
        .eq('organization_id', orgId)
        .order('full_name', { ascending: true })
      if (!cancelled) {
        setStudents(data || [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [orgId])

  const filteredStudents = students.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return s.full_name.toLowerCase().includes(q) || (s.username && s.username.toLowerCase().includes(q))
  })

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (filteredStudents.every((s) => selectedIds.has(s.id))) {
      setSelectedIds((prev) => { const n = new Set(prev); filteredStudents.forEach((s) => n.delete(s.id)); return n })
    } else {
      setSelectedIds((prev) => { const n = new Set(prev); filteredStudents.forEach((s) => n.add(s.id)); return n })
    }
  }

  return (
    <>
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Assign Questions</h2>
        <button type="button" onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-6 py-4 space-y-4">
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode('all')}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
              mode === 'all' ? 'border-accent bg-accent/10 text-accent' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}>
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              All students
            </div>
          </button>
          <button type="button" onClick={() => setMode('specific')}
            className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
              mode === 'specific' ? 'border-accent bg-accent/10 text-accent' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}>
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Specific students
            </div>
          </button>
        </div>

        {loading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}
          </div>
        ) : mode === 'specific' ? (
          <>
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="search" placeholder="Search students..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-md border border-gray-300 pl-10 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-accent focus:outline-none focus:ring-accent" />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <button type="button" onClick={toggleSelectAll} className="text-accent hover:text-accent-hover font-medium">
                {filteredStudents.every((s) => selectedIds.has(s.id)) ? 'Deselect all' : 'Select all'}
              </button>
              <span>{selectedIds.size} of {students.length} selected</span>
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-1">
              {filteredStudents.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">No students match your search</p>
              ) : (
                filteredStudents.map((student) => (
                  <label key={student.id} className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-50 transition-colors">
                    <input type="checkbox" checked={selectedIds.has(student.id)}
                      onChange={() => toggleStudent(student.id)}
                      className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{student.full_name}</p>
                      {student.username && <p className="text-xs text-gray-500 truncate">@{student.username}</p>}
                    </div>
                  </label>
                ))
              )}
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-gray-500 py-4">Questions will be visible to all students in your organisation.</p>
        )}
      </div>

      <div className="flex items-center justify-between border-t px-6 py-4">
        <div />
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="button"
            onClick={() => onSave(mode === 'all', mode === 'specific' ? Array.from(selectedIds) : [])}
            disabled={mode === 'specific' && selectedIds.size === 0}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors">Assign</button>
        </div>
      </div>
    </>
  )
}
