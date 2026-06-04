'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Result {
  answerId: string
  subtopicTitle: string
  topicTitle: string
  totalScore: number
  maxScore: number
  submittedAt: string
}

export default function StudentResultsPage({
  params,
}: {
  params: { studentId: string }
}) {
  const router = useRouter()
  const [profile, setProfile] = useState<{ full_name: string; username: string } | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.studentId])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Check teacher role + get student profile in parallel
    const [profileRes, roleRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('profiles') as any)
        .select('id, full_name, username, email')
        .eq('id', params.studentId)
        .limit(1),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('profiles') as any)
        .select('role').eq('id', user.id).limit(1),
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const student = (profileRes.data as any[] | null)?.[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!student || !((roleRes.data as any[] | null)?.[0]?.role === 'teacher')) {
      router.push('/student')
      return
    }

    setProfile(student)

    // Get all answers + question sets (can parallelize since we need both eventually)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: answers } = await (supabase.from('student_answers') as any)
      .select('*')
      .eq('student_id', params.studentId)
      .order('submitted_at', { ascending: false })

    const answerList = (answers || []) as Array<{ id: string; question_set_id: string; total_score: number; submitted_at: string }>
    if (answerList.length === 0) {
      setResults([])
      setLoading(false)
      return
    }

    const qsIds = Array.from(new Set(answerList.map((a) => a.question_set_id)))

    // Fetch question sets
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: qSets } = await (supabase.from('question_sets') as any)
      .select('id, subtopic_id, questions_json')
      .in('id', qsIds)

    if (!qSets) { setLoading(false); return }

    // Fetch subtopics
    const subIds = Array.from(new Set((qSets as Array<{ subtopic_id: string }>).map((qs) => qs.subtopic_id)))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subtopics } = await (supabase.from('subtopics') as any)
      .select('id, title, topic_id')
      .in('id', subIds)

    // Fetch topics
    const topIds = Array.from(new Set((subtopics || []).map((s: { topic_id: string }) => s.topic_id)))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: topics } = await (supabase.from('topics') as any)
      .select('id, title')
      .in('id', topIds)

    // Build maps
    const topicMap = new Map((topics || []).map((t: { id: string; title: string }) => [t.id, t.title]))
    const subtopicMap = new Map((subtopics || []).map((s: { id: string; title: string; topic_id: string }) => [s.id, s]))

    // Build results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qsMap = new Map((qSets as any[]).map((qs: any) => [qs.id, qs]))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const built: Result[] = []
    for (const answer of answerList) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qs = qsMap.get(answer.question_set_id) as any
      if (!qs) continue
      const questions = (qs.questions_json || []) as Array<{ marks: number }>
      const maxScore = questions.reduce((sum: number, q: { marks?: number }) => sum + (q.marks || 0), 0)
      const sub = subtopicMap.get(qs.subtopic_id)
      built.push({
        answerId: answer.id,
        subtopicTitle: sub?.title || 'Unknown',
        topicTitle: sub ? topicMap.get(sub.topic_id) || '' : '',
        totalScore: answer.total_score,
        maxScore,
        submittedAt: answer.submitted_at,
      })
    }

    setResults(built)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
          <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-36 bg-gray-200 rounded" />
        </div>
        <div className="space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
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
                    {r.topicTitle} &middot; {new Date(r.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
