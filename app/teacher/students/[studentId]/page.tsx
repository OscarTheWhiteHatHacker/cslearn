'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SkeletonStudentDetail } from '@/components/Skeleton'
import { formatDate } from '@/lib/formatters'

interface Result {
  answerId: string
  subtopicTitle: string
  topicTitle: string
  totalScore: number
  maxScore: number
  submittedAt: string
}

export default function StudentDetailPage({
  params,
}: {
  params: { studentId: string }
}) {
  const router = useRouter()

  useEffect(() => {
    document.title = 'Student Details | CSLearn'
  }, [])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createClient()
  const [profile, setProfile] = useState<{ full_name: string; username: string } | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const loadData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // Check teacher role + get student profile in parallel
      const [profileRes, roleRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, username, email').eq('id', params.studentId).limit(1),
        supabase.from('profiles').select('role').eq('id', user.id).limit(1),
      ])

      const student = profileRes.data?.[0]
      if (!student || !(roleRes.data?.[0]?.role === 'teacher')) {
        router.push('/student')
        return
      }

      setProfile(student)

      // Get all answers
      const { data: answers } = await supabase
        .from('student_answers')
        .select('*')
        .eq('student_id', params.studentId)
        .order('submitted_at', { ascending: false })

      const answerList = (answers || []) as Array<{ id: string; question_set_id: string; total_score: number; submitted_at: string }>
      if (answerList.length === 0) {
        setResults([])
        setErrorState(null)
        setLoading(false)
        return
      }

      const qsIds = Array.from(new Set(answerList.map((a) => a.question_set_id)))

      // Fetch question sets
      const { data: qSets } = await supabase
        .from('question_sets')
        .select('id, subtopic_id, questions_json')
        .in('id', qsIds)

      if (!qSets) { setErrorState(null); setLoading(false); return }

      // Fetch subtopics
      const subIds = Array.from(new Set((qSets as Array<{ subtopic_id: string }>).map((qs: { subtopic_id: string }) => qs.subtopic_id)))
      const { data: subtopics } = await supabase
        .from('subtopics')
        .select('id, title, topic_id')
        .in('id', subIds)

      // Fetch topics
      const topIds = Array.from(new Set((subtopics || []).map((s: { topic_id: string }) => s.topic_id)))
      const { data: topics } = await supabase
        .from('topics')
        .select('id, title')
        .in('id', topIds)

      // Build lookup maps
      const topicMap = new Map((topics || []).map((t: { id: string; title: string }) => [t.id, t.title]))
      const subtopicMap = new Map((subtopics || []).map((s: { id: string; title: string; topic_id: string }) => [s.id, s]))
      const qsMap = new Map((qSets as Array<{ id: string; subtopic_id: string; questions_json: Array<{ marks: number }> }>).map((qs) => [qs.id, qs]))

      // Build results
      const built: Result[] = []
      for (const answer of answerList) {
        const qs = qsMap.get(answer.question_set_id)
        if (!qs) continue
        const questions = (qs.questions_json || []) as Array<{ marks: number }>
        const maxScore = questions.reduce((sum: number, q: { marks?: number }) => sum + (q.marks || 0), 0)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = subtopicMap.get(qs.subtopic_id) as any
        built.push({
          answerId: answer.id,
          subtopicTitle: sub?.title || 'Unknown',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          topicTitle: sub ? (topicMap.get(sub.topic_id) as any) || '' : '',
          totalScore: answer.total_score,
          maxScore,
          submittedAt: answer.submitted_at,
        })
      }

      setResults(built)
      setErrorState(null)
      setLoading(false)
    } catch (err) {
      if (controller.signal.aborted) return
      setErrorState(err instanceof Error ? err.message : 'Failed to load student data')
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  interval? | null = null

  loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.studentId])

  // Add live updates
  useEffect(() => {
    loadData()

    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.studentId, loadData])

  if (loading) {
    return <SkeletonStudentDetail />
  }

  if (errorState) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-700">Failed to load student data</h2>
        <p className="mt-2 text-sm text-gray-500">{errorState}</p>
        <button
          onClick={() => { setErrorState(null); setLoading(true); loadData() }}
          className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/teacher/students" className="text-sm font-medium text-blue-600 hover:text-blue-800">
          &larr; Back to Students
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{profile?.full_name || 'Student'}</h1>
        <p className="mt-1 text-sm text-gray-500">
          @{profile?.username || '-'} &middot; {results.length} completed question set{results.length !== 1 ? 's' : ''}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <h2 className="text-lg font-semibold text-gray-700">No results yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            This student hasn&apos;t completed any question sets assigned by you.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r) => {
            const ratio = r.maxScore > 0 ? r.totalScore / r.maxScore : 0
            const scoreColor = ratio >= 0.7 ? 'text-green-700' : ratio >= 0.4 ? 'text-amber-700' : 'text-red-700'
            const scoreBg = ratio >= 0.7 ? 'bg-green-100' : ratio >= 0.4 ? 'bg-amber-100' : 'bg-red-100'

            return (
              <Link
                key={r.answerId}
                href={`/teacher/answers/${r.answerId}`}
                className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-300"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-gray-900 truncate">{r.subtopicTitle}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.topicTitle} &middot; {formatDate(r.submittedAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className={`flex items-center gap-2 rounded-lg ${scoreBg} px-4 py-2`}>
                  <span className={`text-lg font-bold ${scoreColor}`}>{r.totalScore}/{r.maxScore}</span>
                </div>
                <svg className="h-5 w-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
