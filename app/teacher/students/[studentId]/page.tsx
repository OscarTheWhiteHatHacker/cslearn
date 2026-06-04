import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getStudentResults(studentId: string): Promise<any> {
  const supabase = await createClient()

  // Get student profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileList } = await (supabase.from('profiles') as any)
    .select('id, full_name, username, email')
    .eq('id', studentId)
    .limit(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (profileList as any[] | null)?.[0]
  if (!profile) return null

  // Get all answers for this student
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: answers } = await (supabase.from('student_answers') as any)
    .select('*')
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false })

  // Get all question set IDs
  const answerList = (answers || []) as Array<{ question_set_id: string; total_score: number; submitted_at: string; id: string }>
  const qsIds = Array.from(new Set(answerList.map((a) => a.question_set_id)))

  // Fetch question sets with subtopics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: qSets } = await (supabase.from('question_sets') as any)
    .select('id, subtopic_id, questions_json, created_at, status')
    .in('id', qsIds)

  // Fetch subtopics
  const subIds = Array.from(new Set((qSets || []).map((qs: { subtopic_id: string }) => qs.subtopic_id)))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subtopics } = await (supabase.from('subtopics') as any)
    .select('id, title, topic_id')
    .in('id', subIds)

  // Fetch topics
  const topIds = [...new Set((subtopics || []).map((s: { topic_id: string }) => s.topic_id))]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: topics } = await (supabase.from('topics') as any)
    .select('id, title')
    .in('id', topIds)

  // Build lookup maps
  const topicMap = new Map((topics || []).map((t: { id: string; title: string }) => [t.id, t.title]))
  const subtopicMap = new Map((subtopics || []).map((s: { id: string; title: string; topic_id: string }) => [s.id, s]))
  const qsMap = new Map((qSets || []).map((qs: { id: string }) => [qs.id, qs]))

  // Build results
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = []
  for (const answer of answerList) {
    const qs = qsMap.get(answer.question_set_id)
    if (!qs) continue
    const questions = (qs.questions_json || []) as Array<{ marks: number }>
    const maxScore = questions.reduce((sum: number, q: { marks?: number }) => sum + (q.marks || 0), 0)
    const sub = subtopicMap.get(qs.subtopic_id)
    results.push({
      answerId: answer.id,
      questionSetId: answer.question_set_id,
      subtopicTitle: sub?.title || 'Unknown',
      topicTitle: sub ? topicMap.get(sub.topic_id) || '' : '',
      totalScore: answer.total_score,
      maxScore,
      submittedAt: answer.submitted_at,
      status: qs.status,
    })
  }

  return { profile, results }
}

export default async function StudentResultsPage({
  params,
}: {
  params: { studentId: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Check teacher role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileList } = await (supabase.from('profiles') as any)
    .select('role').eq('id', user.id).limit(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!((profileList as any[] | null)?.[0]?.role === 'teacher')) redirect('/student')

  const data = await getStudentResults(params.studentId)
  if (!data) return <div className="p-6 text-gray-500">Student not found.</div>

  const { profile, results } = data

  return (
    <div className="space-y-6">
      <div>
        <Link href="/teacher/students" className="text-sm font-medium text-blue-600 hover:text-blue-800">
          &larr; Back to Students
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{profile.full_name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          @{profile.username || '-'} &middot; {results.length} completed question set{results.length !== 1 ? 's' : ''}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-gray-700">No results yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            This student hasn&apos;t completed any question sets assigned by you.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((r: { answerId: string; subtopicTitle: string; topicTitle: string; totalScore: number; maxScore: number; submittedAt: string; status: string }) => {
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
