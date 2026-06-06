'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface StudentData {
  id: string
  full_name: string
}

interface QuestionSetData {
  id: string
  subtopic_id: string
  teacher_id: string
  questions_json: unknown
  created_at: string
  subtopic_title: string
  subtopic_topic_title: string
}

interface StudentAnswerData {
  id: string
  question_set_id: string
  student_id: string
  total_score: number
  submitted_at: string
}

interface DashboardData {
  teacherName: string
  orgName: string
  orgSlug: string
  students: StudentData[]
  questionSets: QuestionSetData[]
  answers: StudentAnswerData[]
}

function getScoreColorClass(score: number, maxScore: number): string {
  if (maxScore === 0) return 'text-gray-500'
  const ratio = score / maxScore
  if (ratio >= 0.7) return 'text-green-600'
  if (ratio >= 0.4) return 'text-amber-600'
  return 'text-red-600'
}

function getScoreBgClass(score: number, maxScore: number): string {
  if (maxScore === 0) return 'bg-gray-100'
  const ratio = score / maxScore
  if (ratio >= 0.7) return 'bg-green-50 border-green-200'
  if (ratio >= 0.4) return 'bg-amber-50 border-amber-200'
  return 'bg-red-50 border-red-200'
}

async function fetchDashboardData(): Promise<DashboardData | null> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = supabase

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get teacher profile
  const { data: profileList } = await s
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .limit(1)

  const typedProfile = profileList?.[0]
  if (!typedProfile || typedProfile.role !== 'teacher') return null

  const teacherOrgId = typedProfile.organization_id

  // Org info
  let orgName = ''
  let orgSlug = ''
  if (teacherOrgId) {
    const { data: orgData } = await s
      .from('organizations')
      .select('name, slug')
      .eq('id', teacherOrgId)
      .limit(1)
    const org = orgData?.[0]
    if (org) {
      orgName = org.name
      orgSlug = org.slug
    }
  }

  // Students
  let studentQuery = s
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'student')
    .order('full_name', { ascending: true })
  if (teacherOrgId) {
    studentQuery = studentQuery.eq('organization_id', teacherOrgId)
  }
  const { data: studentList } = await studentQuery

  // Teacher IDs in org
  let teacherIdsQuery = s
    .from('profiles')
    .select('id')
    .eq('role', 'teacher')
  if (teacherOrgId) {
    teacherIdsQuery = teacherIdsQuery.eq('organization_id', teacherOrgId)
  }
  const { data: teacherIdsResult } = await teacherIdsQuery
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teacherIds = (teacherIdsResult || []).map((t: any) => t.id)

  // Question sets
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allSets } = await qsQuery as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questionSets: QuestionSetData[] = (allSets || []).map((set: any) => ({
    id: set.id,
    subtopic_id: set.subtopic_id,
    teacher_id: set.teacher_id,
    questions_json: set.questions_json,
    created_at: set.created_at,
    subtopic_title: set.subtopics?.title || 'Unknown Subtopic',
    subtopic_topic_title: set.subtopics?.topics?.title || 'Unknown Topic',
  }))

  // Student answers
  const orgQuestionSetIds = questionSets.map((s) => s.id)
  let answersQuery = s
    .from('student_answers')
    .select('id, question_set_id, student_id, total_score, submitted_at')
  if (orgQuestionSetIds.length > 0) {
    answersQuery = answersQuery.in('question_set_id', orgQuestionSetIds)
  } else {
    answersQuery = answersQuery.eq('id', '00000000-0000-0000-0000-000000000000')
  }
  const { data: allAnswers } = await answersQuery

  return {
    teacherName: typedProfile?.full_name || 'Teacher',
    orgName,
    orgSlug,
    students: (studentList || []).filter(Boolean),
    questionSets,
    answers: (allAnswers || []) as StudentAnswerData[],
  }
}

export default function TeacherDashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)

  useEffect(() => {
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null

    async function load() {
      const result = await fetchDashboardData()
      if (cancelled) return
      if (result === null) {
        setUnauthorized(true)
        setLoading(false)
        return
      }
      setData(result)
      setLoading(false)
    }

    load()

    // Polling fallback every 8s
    interval = setInterval(load, 8000)

    // Supabase Realtime subscription
    const supabase = createClient()
    try {
      channel = supabase
        .channel('teacher-dashboard-live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          () => { load() },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'student_answers' },
          () => { load() },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'question_sets' },
          () => { load() },
        )
        .subscribe()
    } catch {
      // Realtime unavailable — polling fallback handles it
    }

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  if (unauthorized) {
    router.push('/auth/login')
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    )
  }

  if (!data) return null

  const { teacherName, orgName, orgSlug, students, questionSets, answers } = data

  // Build answer lookup
  const answerMap = new Map<string, StudentAnswerData>()
  for (const ans of answers) {
    answerMap.set(`${ans.student_id}_${ans.question_set_id}`, ans)
  }

  // Stats
  const totalStudents = students.length
  const totalQuestionSets = questionSets.length
  const totalSubmissions = answers.length
  const submittedStudentIds = new Set(answers.map((a) => a.student_id))
  const activeStudents = submittedStudentIds.size

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Welcome back, {teacherName}
        </p>
        {orgName && orgSlug && (
          <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-sm font-medium text-indigo-900">{orgName}</p>
            <p className="mt-1 text-sm text-indigo-700">
              School code: <code className="rounded bg-indigo-100 px-2 py-0.5 font-mono text-indigo-800">{orgSlug}</code>
              <span className="ml-2 text-xs text-indigo-500">— share this with your students to join</span>
            </p>
          </div>
        )}
      </div>

      {/* Stats Cards — live updating */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Students</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{totalStudents}</p>
        </div>
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Question Sets</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{totalQuestionSets}</p>
        </div>
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Submissions</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{totalSubmissions}</p>
        </div>
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Active Students</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{activeStudents}</p>
        </div>
      </div>

      {/* Students Table — live updating */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="border-b bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Student Progress</h2>
            <p className="mt-1 text-sm text-gray-500">
              Overview of all students and their question set completion status.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        </div>

        {students.length === 0 || questionSets.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {students.length === 0 ? (
              <>
                <h3 className="mt-4 text-lg font-semibold text-gray-700">No students yet</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Students need to sign up before their progress appears here.
                </p>
              </>
            ) : (
              <>
                <h3 className="mt-4 text-lg font-semibold text-gray-700">No question sets yet</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Create question sets from the Topics page to track student progress.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Student
                  </th>
                  {questionSets.map((set) => (
                    <th
                      key={set.id}
                      scope="col"
                      className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 min-w-[140px]"
                      title={`${set.subtopic_topic_title} - ${set.subtopic_title}`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="truncate max-w-[120px] block">{set.subtopic_title}</span>
                        <span className="text-[10px] text-gray-400 truncate max-w-[120px] block">{set.subtopic_topic_title}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="sticky left-0 bg-white px-6 py-4 whitespace-nowrap border-r border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                          {student.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <p className="text-sm font-medium text-gray-900">{student.full_name}</p>
                      </div>
                    </td>
                    {questionSets.map((set) => {
                      const answer = answerMap.get(`${student.id}_${set.id}`)
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const questions = (set.questions_json || []) as any[]
                      const maxScore = Array.isArray(questions)
                        ? questions.reduce((sum: number, q: { marks?: number }) => sum + (q.marks || 0), 0)
                        : 0

                      return (
                        <td key={set.id} className="px-4 py-4 text-center">
                          {answer ? (
                            <Link
                              href={`/teacher/answers/${answer.id}`}
                              className={`group inline-flex flex-col items-center gap-1 rounded-lg border px-3 py-2 transition-all hover:shadow-md ${getScoreBgClass(answer.total_score, maxScore)}`}
                            >
                              <span className={`text-sm font-bold ${getScoreColorClass(answer.total_score, maxScore)}`}>
                                {answer.total_score}/{maxScore}
                              </span>
                              <span className="text-[10px] text-gray-400 group-hover:text-gray-600">
                                {new Date(answer.submitted_at).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            </Link>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                              Not started
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/teacher/topics"
          className="group rounded-lg border bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-blue-300"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">Manage Topics</h3>
              <p className="text-sm text-gray-500">Create and release lesson content</p>
            </div>
          </div>
        </Link>
        <div className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Analytics</h3>
              <p className="text-sm text-gray-500">{activeStudents} of {totalStudents} students have submitted answers</p>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${totalStudents > 0 ? (activeStudents / totalStudents) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
