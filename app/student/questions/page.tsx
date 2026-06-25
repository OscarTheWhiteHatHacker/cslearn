'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/formatters'
import { SkeletonStudentQuestions } from '@/components/Skeleton'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'

interface QuestionSetInfo {
  id: string
  subtopic_id: string
  teacher_id: string
  questions_json: unknown
  created_at: string
  subtopic_title: string
  topic_title: string
  answer: {
    id: string
    total_score: number
    submitted_at: string
  } | null
  max_score: number
}

async function getStudentQuestionSets(): Promise<QuestionSetInfo[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = supabase

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profileList } = await s
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studentProfile = (profileList as any[] | null)?.[0]
  const studentOrgId = studentProfile?.organization_id

  // Find teachers in same organization
  let teacherIds: string[] = []
  if (studentOrgId) {
    const { data: teachersInOrg } = await s
      .from('profiles')
      .select('id')
      .eq('role', 'teacher')
      .eq('organization_id', studentOrgId)

    // Also include org_admins (they create content too)
    const { data: adminsInOrg } = await s
      .from('profiles')
      .select('id')
      .eq('role', 'org_admin')
      .eq('organization_id', studentOrgId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    teacherIds = ((teachersInOrg as any[]) || []).map((t: any) => t.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    teacherIds = teacherIds.concat(((adminsInOrg as any[]) || []).map((t: any) => t.id))
  }

  // Build query for question sets
  let qsQuery = s
    .from('question_sets')
    .select(`
      *,
      subtopics!inner (
        title,
        topics!inner (
          title
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (teacherIds.length > 0) {
    qsQuery = qsQuery.in('teacher_id', teacherIds)
  }

  qsQuery = qsQuery.eq('status', 'published')

  const { data: allSets } = await qsQuery

  if (!allSets) return []

  // Get all student answers for this student
  const { data: allAnswers } = await s
    .from('student_answers')
    .select('id, question_set_id, total_score, submitted_at')
    .eq('student_id', user.id)

  // Build answer lookup map
  const answerMap = new Map<string, { id: string; total_score: number; submitted_at: string }>()
  if (allAnswers) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const ans of allAnswers as any[]) {
      answerMap.set(ans.question_set_id, {
        id: ans.id,
        total_score: ans.total_score,
        submitted_at: ans.submitted_at,
      })
    }
  }

  // Build result with subtopic title and max score
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: QuestionSetInfo[] = (allSets as any[]).map((set: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questions = (set.questions_json || []) as any[]
    const maxScore = Array.isArray(questions)
      ? questions.reduce((sum: number, q: { marks?: number }) => sum + (q.marks || 0), 0)
      : 0

    return {
      id: set.id,
      subtopic_id: set.subtopic_id,
      teacher_id: set.teacher_id,
      questions_json: set.questions_json,
      created_at: set.created_at,
      subtopic_title: set.subtopics?.title || 'Unknown Subtopic',
      topic_title: set.subtopics?.topics?.title || 'Unknown Topic',
      answer: answerMap.get(set.id) || null,
      max_score: maxScore,
    }
  })

  return result
}

export default function StudentQuestionsPage() {
  const [questionSets, setQuestionSets] = useState<QuestionSetInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    document.title = 'Practice Questions | CSLearn'
  }, [])

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await getStudentQuestionSets()
      if (controller.signal.aborted) return
      setQuestionSets(result)
      setErrorState(null)
      setLoading(false)
    } catch (err) {
      if (controller.signal.aborted) return
      setErrorState(err instanceof Error ? err.message : 'Failed to load questions')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const interval: ReturnType<typeof setInterval> | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null

    load()

    // Polling fallback every 8s
    // Supabase Realtime subscription
    const supabase = createClient()
    try {
      channel = supabase
        .channel('student-questions-live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'question_sets' },
          () => { if (!cancelled) load() },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'student_answers' },
          () => { if (!cancelled) load() },
        )
        .subscribe()
    } catch {
      // Realtime unavailable — polling handles it
    }

    return () => {
      cancelled = true
      if (abortRef.current) abortRef.current.abort()
      if (interval) clearInterval(interval)
      if (channel) supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load])

  if (loading) {
    return <SkeletonStudentQuestions />
  }

  if (errorState) {
    return (
      <ErrorState
        title="Failed to load questions"
        message={errorState}
        onRetry={() => { setErrorState(null); setLoading(true); load() }}
      />
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Practice Questions</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Question sets assigned by your teacher. Complete them to get AI-marked feedback.
          </p>
        </div>
        {questionSets.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {questionSets.length > 0 ? (
        <div className="space-y-4">
          {questionSets.map((set) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const questions = (set.questions_json || []) as any[]
            const questionCount = Array.isArray(questions) ? questions.length : 0
            const isCompleted = set.answer !== null

            return (
              <Link
                key={set.id}
                href={isCompleted ? `/student/questions/${set.id}?view=results` : `/student/questions/${set.id}`}
                className={`block rounded-lg border bg-white p-6 shadow-sm transition-all hover:shadow-md dark:bg-gray-800 dark:border-gray-700 ${
                  isCompleted ? 'hover:border-green-300 dark:hover:border-green-600' : 'hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate dark:text-gray-100">
                      {set.subtopic_title}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {set.topic_title}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {questionCount} question{questionCount !== 1 ? 's' : ''}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {set.max_score} mark{set.max_score !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <div className="text-right">
                          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-300">
                            Completed
                          </span>
                          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Score: {set.answer!.total_score}/{set.max_score}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(set.answer!.submitted_at)}
                          </p>
                      </div>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                        Not started
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <EmptyState
          title="No question sets yet"
          description="Your teacher hasn't assigned any question sets yet. Check back later!"
        />
      )}
    </section>
  )
}
