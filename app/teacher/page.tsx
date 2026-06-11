'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SkeletonDashboard } from '@/components/Skeleton'
import { formatDate, getScoreColorClass, getScoreBgClass } from '@/lib/formatters'
import { Button } from '@/components/ui/Button'

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
  allStudents: StudentData[]
  questionSets: QuestionSetData[]
  answers: StudentAnswerData[]
  totalStudents: number
  totalQuestionSets: number
  totalSubmissions: number
  activeStudents: number
}

const STUDENTS_PER_PAGE = 10

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchDashboardData(signal?: AbortSignal): Promise<DashboardData | null> {
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

  const students = (studentList || []).filter(Boolean) as StudentData[]
  const answers = (allAnswers || []) as StudentAnswerData[]
  const submittedStudentIds = new Set(answers.map((a) => a.student_id))

  return {
    teacherName: typedProfile?.full_name || 'Teacher',
    orgName,
    orgSlug,
    students,
    allStudents: students,
    questionSets,
    answers,
    totalStudents: students.length,
    totalQuestionSets: questionSets.length,
    totalSubmissions: answers.length,
    activeStudents: submittedStudentIds.size,
  }
}

export default function TeacherDashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const [page, setPage] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    document.title = 'Teacher Dashboard | CSLearn'
  }, [])

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await Promise.race([
        fetchDashboardData(controller.signal),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out')), 15000)
        ),
      ])
      if (controller.signal.aborted) return
      if (result === null) {
        setUnauthorized(true)
        setLoading(false)
        return
      }
      setData(result)
      setErrorState(null)
      setLoading(false)
    } catch (err) {
      if (controller.signal.aborted) return
      setErrorState(err instanceof Error ? err.message : 'Failed to load dashboard data')
      setLoading(false)
    }
  }, [])

  const handleRetry = useCallback(() => {
    setErrorState(null)
    setLoading(true)
    load()
  }, [load])

  useEffect(() => {
    load()

    // Supabase Realtime subscription
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null
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
      if (abortRef.current) abortRef.current.abort()
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load])

  // Use useMemo for expensive computations — must be before all early returns
  const answerMap = useMemo(() => {
    const map = new Map<string, StudentAnswerData>()
    for (const ans of (data?.answers || [])) {
      map.set(`${ans.student_id}_${ans.question_set_id}`, ans)
    }
    return map
  }, [data?.answers])

  const stats = useMemo(() => ({
    totalStudents: data?.allStudents?.length || 0,
    totalQuestionSets: data?.questionSets?.length || 0,
    totalSubmissions: data?.answers?.length || 0,
    activeStudents: new Set((data?.answers || []).map((a) => a.student_id)).size,
  }), [data?.allStudents, data?.questionSets, data?.answers])

  const totalPages = Math.ceil((data?.allStudents?.length || 0) / STUDENTS_PER_PAGE)
  const paginatedStudents = useMemo(() => {
    return (data?.allStudents || []).slice(page * STUDENTS_PER_PAGE, (page + 1) * STUDENTS_PER_PAGE)
  }, [data?.allStudents, page])

  if (unauthorized) {
    router.push('/auth/login')
    return null
  }

  if (loading) {
    return <SkeletonDashboard />
  }

  if (errorState) {
    return (
      <section className="flex flex-col items-center justify-center py-20">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-700">Failed to load dashboard</h2>
        <p className="mt-2 text-sm text-gray-500">{errorState}</p>
        <div className="mt-4">
          <Button type="button" onClick={handleRetry}>
            Try again
          </Button>
        </div>
      </section>
    )
  }

  if (!data) return null

  const { teacherName, orgName, orgSlug, questionSets, allStudents } = data

  return (
    <div className="space-y-6">
      {/* Header section */}
      <section>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Teacher Dashboard</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Welcome back, {teacherName}
        </p>
        {orgName && orgSlug && (
          <div className="mt-3 rounded-lg border border-indigo-200 bg-accent-bg p-4 dark:border-indigo-800 dark:bg-indigo-950">
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-200">{orgName}</p>
            <p className="mt-1 text-sm text-accent dark:text-indigo-300">
              School code: <code className="rounded bg-accent-bg px-2 py-0.5 font-mono text-accent dark:bg-indigo-900 dark:text-indigo-200">{orgSlug}</code>
              <span className="ml-2 text-xs text-indigo-500 dark:text-indigo-400">— share this with your students to join</span>
            </p>
          </div>
        )}
      </section>

      {/* Stats Cards — live updating */}
      <section aria-labelledby="stats-heading" aria-live="polite" aria-atomic="true">
        <h2 id="stats-heading" className="sr-only">Dashboard Statistics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-white p-5 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Students</p>
            <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalStudents}</p>
          </div>
          <div className="rounded-lg border bg-white p-5 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Question Sets</p>
            <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalQuestionSets}</p>
          </div>
          <div className="rounded-lg border bg-white p-5 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Submissions</p>
            <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalSubmissions}</p>
          </div>
          <div className="rounded-lg border bg-white p-5 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Active Students</p>
            <p className="mt-2 text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.activeStudents}</p>
          </div>
        </div>
      </section>

      {/* Students Table — live updating */}
      <section aria-labelledby="students-table-heading" aria-live="polite" aria-atomic="true">
        <div className="rounded-lg border bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="border-b bg-gray-50 px-6 py-4 flex items-center justify-between dark:bg-gray-800 dark:border-gray-700">
            <div>
              <h2 id="students-table-heading" className="text-lg font-semibold text-gray-900 dark:text-gray-100">Student Progress</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Overview of all students and their question set completion status.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </div>

          {paginatedStudents.length === 0 || questionSets.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {paginatedStudents.length === 0 ? (
                <>
                  <h3 className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">No students yet</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Students need to sign up before their progress appears here.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">No question sets yet</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Create question sets from the Topics page to track student progress.
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th scope="col" className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        Student
                      </th>
                      {questionSets.map((set) => (
                        <th
                          key={set.id}
                          scope="col"
                          className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 min-w-[140px] dark:text-gray-400"
                          title={`${set.subtopic_topic_title} - ${set.subtopic_title}`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className="truncate max-w-[120px] block">{set.subtopic_title}</span>
                            <span className="text-[10px] text-gray-400 truncate max-w-[120px] block dark:text-gray-500">{set.subtopic_topic_title}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                    {paginatedStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-blue-50/50 transition-colors dark:hover:bg-gray-700/50">
                        <td className="sticky left-0 bg-white px-6 py-4 whitespace-nowrap border-r border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              {student.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{student.full_name}</p>
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
                                  <span className="text-[10px] text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300">
                                    {formatDate(answer.submitted_at, { day: 'numeric', month: 'short' })}
                                  </span>
                                </Link>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-3 dark:bg-gray-800 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {page * STUDENTS_PER_PAGE + 1}–{Math.min((page + 1) * STUDENTS_PER_PAGE, allStudents.length)} of {allStudents.length} students
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPage(i)}
                        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          page === i
                            ? 'bg-accent text-white'
                            : 'border bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                      disabled={page >= totalPages - 1}
                      className="rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Quick Links */}
      <section aria-labelledby="quick-links-heading">
        <h2 id="quick-links-heading" className="sr-only">Quick Links</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/teacher/topics"
            className="group rounded-lg border bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-blue-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-blue-600"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                <svg className="h-5 w-5 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors dark:text-gray-100 dark:group-hover:text-blue-400">Manage Topics</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Create and release lesson content</p>
              </div>
            </div>
          </Link>
          <div className="rounded-lg border bg-white p-5 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                <svg className="h-5 w-5 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Analytics</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stats.activeStudents} of {stats.totalStudents} students have submitted answers</p>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${stats.totalStudents > 0 ? (stats.activeStudents / stats.totalStudents) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
