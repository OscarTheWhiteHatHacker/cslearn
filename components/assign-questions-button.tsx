'use client'

import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/formatters'
import StudentReleaseModal from './student-release-modal'

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

  // Fetch existing question sets on mount
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsedQuestions = (data.questionSet?.questions_json || []) as any[]

      setEditingQuestions(parsedQuestions as Question[])
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
    const newQ: Question = {
      question: '',
      marks: 2,
      mark_scheme: '',
    }
    // Insert at the end but before saving, validate
    setEditingQuestions([...editingQuestions, newQ])
  }

  const handleSave = async () => {
    if (!editingSet) return
    setLoading(true)
    setError('')

    // Validate all questions have content
    for (let i = 0; i < editingQuestions.length; i++) {
      const q = editingQuestions[i]
      if (!q.question.trim()) {
        setError(`Question ${i + 1} has no question text`)
        setLoading(false)
        return
      }
      if (!q.mark_scheme.trim()) {
        setError(`Question ${i + 1} has no mark scheme`)
        setLoading(false)
        return
      }
      if (q.marks < 1) {
        setError(`Question ${i + 1} must have at least 1 mark`)
        setLoading(false)
        return
      }
    }

    try {
      const response = await fetch('/api/question-set', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingSet.id, questions: editingQuestions }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save')
      }

      setSuccess('Changes saved!')
      await loadQuestionSets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const handlePublishClick = (id: string, currentlyPublished: boolean) => {
    if (orgId && !currentlyPublished) {
      // Show modal for per-student assignment
      setShowStudentModal(true)
      // Set editing set to the one being published
      const target = [...draftSets, ...publishedSets].find(s => s.id === id)
      if (target) {
        setEditingSet(target)
        setEditingQuestions([...target.questions_json])
      }
    } else {
      // Direct toggle (unpublish or no org context)
      handlePublish(id, currentlyPublished, true, [])
    }
  }

  const handlePublish = async (id: string, currentlyPublished: boolean, releaseAll: boolean, studentIds: string[]) => {
    setLoading(true)
    setError('')

    // If we have unsaved edits in the editor, save them first
    if (editingSet && editingSet.id === id && editingQuestions.length > 0) {
      // Validate before saving
      for (let i = 0; i < editingQuestions.length; i++) {
        const q = editingQuestions[i]
        if (!q.question.trim()) {
          setError(`Question ${i + 1} has no question text`)
          setLoading(false)
          return
        }
        if (!q.mark_scheme.trim()) {
          setError(`Question ${i + 1} has no mark scheme`)
          setLoading(false)
          return
        }
        if (q.marks < 1) {
          setError(`Question ${i + 1} must have at least 1 mark`)
          setLoading(false)
          return
        }
      }

      // Save edits via PATCH
      const saveRes = await fetch('/api/question-set', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, questions: editingQuestions }),
      })
      const saveData = await saveRes.json()
      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Failed to save edits before publishing')
      }
    }

    // Now toggle publish status with per-student data
    try {
      const response = await fetch('/api/question-set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          releaseAll,
          studentIds: releaseAll ? [] : studentIds,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update')
      }

      const published = data.status === 'published'
      setSuccess(
        published
          ? releaseAll
            ? 'Questions assigned to all students!'
            : `Questions assigned to ${studentIds.length} student(s)!`
          : 'Questions unassigned from students.'
      )
      setEditingSet(null)
      setEditingQuestions([])
      await loadQuestionSets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
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
          <button
            onClick={() => setShowDrafts(!showDrafts)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            {showDrafts ? 'Hide' : `View all (${draftSets.length + publishedSets.length})`}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Existing sets list */}
      {showDrafts && !editingSet && (
        <div className="space-y-3 mt-4">
          {publishedSets.map((set) => (
            <div key={set.id} className="rounded-lg border border-green-200 bg-green-50 p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Published</span>
                  <span className="text-sm text-gray-700">{set.questions_json.length} questions</span>
                  <span className="text-xs text-gray-500">{formatDate(set.created_at)}</span>
                </div>
              </div>
              <button
                onClick={() => handlePublishClick(set.id, true)}
                className="text-sm text-amber-600 hover:text-amber-800 font-medium"
              >
                Unassign
              </button>
            </div>
          ))}

          {draftSets.map((set) => (
            <div key={set.id} className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Draft</span>
                  <span className="text-sm text-gray-700">{set.questions_json.length} questions</span>
                  <span className="text-xs text-gray-500">{formatDate(set.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEditing(set)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteDraft(set.id)}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {draftSets.length === 0 && publishedSets.length === 0 && (
            <p className="text-sm text-gray-500">No question sets yet.</p>
          )}
        </div>
      )}

      {/* Editing panel */}
      {editingSet && !showStudentModal && (
        <div className="mt-6 space-y-4 border border-gray-200 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Edit Questions ({editingQuestions.length})
            </h3>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {editingSet.status === 'published' ? 'Published' : 'Draft'}
            </span>
          </div>

          <div className="space-y-4">
            {editingQuestions.map((q, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-semibold text-gray-900">Question {i + 1}</h4>
                  <button
                    onClick={() => removeQuestion(i)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Question text</label>
                  <textarea
                    value={q.question}
                    onChange={(e) => updateQuestion(i, 'question', e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent focus:ring-accent"
                  />
                </div>

                <div className="flex gap-2 items-start">
                  <div className="w-20">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Marks</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={q.marks}
                      onChange={(e) => updateQuestion(i, 'marks', parseInt(e.target.value) || 1)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent focus:ring-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mark scheme</label>
                  <textarea
                    value={q.mark_scheme}
                    onChange={(e) => updateQuestion(i, 'mark_scheme', e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-accent focus:ring-accent"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addQuestion}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add question
          </button>

          <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => handlePublishClick(editingSet.id, editingSet.status === 'published')}
              disabled={loading || editingQuestions.length === 0}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-all"
            >
              {loading ? 'Working...' : editingSet.status === 'published' ? 'Unassign' : 'Assign to Students'}
            </button>
            <button
              onClick={cancelEditing}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Student release modal */}
      {showStudentModal && editingSet && orgId && (
        <StudentReleaseModal
          apiEndpoint="/api/question-set"
          contentId={editingSet.id}
          orgId={orgId}
          onClose={() => {
            setShowStudentModal(false)
            setEditingSet(null)
            setEditingQuestions([])
          }}
          onSaved={() => {
            // After modal saves, refresh
            setShowStudentModal(false)
            setEditingSet(null)
            setEditingQuestions([])
            loadQuestionSets()
          }}
        />
      )}
    </div>
  )
}
