import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ReleaseToggle from '@/components/release-toggle'
import LessonReleaseToggle from '@/components/lesson-release-toggle'
import AssignQuestionsButton from '@/components/assign-questions-button'

interface LessonContent {
  learning_objectives: string[]
  explanation: string
  key_points: string[]
  examples: string[]
  common_misconceptions: string[]
}

interface Lesson {
  id: string
  title: string
  order_number: number
  content_json: LessonContent
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPageData(subtopicId: string, topicId: string): Promise<any> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Parallel queries
  const [subtopicResult, topicResult, lessonsResult] = await Promise.all([
    (supabase.from('subtopics') as any).select('*').eq('id', subtopicId).limit(1),
    (supabase.from('topics') as any).select('*').eq('id', topicId).limit(1),
    (supabase.from('lessons') as any).select('*').eq('subtopic_id', subtopicId).order('order_number'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subtopic = (subtopicResult.data as any[] | null)?.[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topic = (topicResult.data as any[] | null)?.[0]
  const lessons: Lesson[] = (lessonsResult.data as Lesson[]) || []

  // Release status queries (parallel)
  let subtopicReleased = false
  let releasedLessonIds = new Set<string>()

  if (user) {
    const [releaseResult, lessonIdsResult] = await Promise.all([
      (supabase.from('released_subtopics') as any)
        .select('id').eq('subtopic_id', subtopicId).eq('teacher_id', user.id).limit(1),
      (supabase.from('released_lessons') as any)
        .select('lesson_id').eq('teacher_id', user.id),
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subtopicReleased = ((releaseResult.data as any[] | null)?.length || 0) > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    releasedLessonIds = new Set((lessonIdsResult.data as any[] || []).map((r: any) => r.lesson_id))
  }

  return { subtopic, topic, lessons, subtopicReleased, releasedLessonIds }
}

function renderInline(text: string) {
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g
  let match: RegExpExecArray | null
  let lastIndex = 0
  let idx = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    if (match[2] !== undefined) parts.push(<strong key={idx++}>{match[2]}</strong>)
    else if (match[3] !== undefined) parts.push(<code key={idx++} className="bg-gray-100 text-red-600 px-1 rounded text-xs font-mono">{match[3]}</code>)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length > 0 ? parts : text
}

function renderExplanation(text: string) {
  return text.split('\n').map((line: string, i: number) => {
    if (line.startsWith('## ')) return <h3 key={i} className="text-base font-semibold text-gray-900 mt-4 mb-2">{line.replace('## ', '')}</h3>
    if (line.startsWith('### ')) return <h4 key={i} className="text-sm font-semibold text-gray-800 mt-3 mb-1">{line.replace('### ', '')}</h4>
    if (line.trim() === '') return <br key={i} />
    return <p key={i} className="mb-2">{renderInline(line)}</p>
  })
}

export default async function TeacherSubtopicPage({
  params,
  searchParams,
}: {
  params: { topicId: string; subtopicId: string }
  searchParams: { lesson?: string }
}) {
  const { subtopic, topic, lessons, subtopicReleased, releasedLessonIds } = await getPageData(
    params.subtopicId, params.topicId
  )

  if (!subtopic || !topic) notFound()

  const selectedLessonIdx = Math.min(
    Math.max(parseInt(searchParams.lesson || '0', 10) || 0, 0),
    Math.max(lessons.length - 1, 0)
  )
  const selectedLesson = lessons[selectedLessonIdx] || null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href={`/teacher/topics/${topic.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
          &larr; Back to {topic.title}
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{subtopic.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              J277/{topic.component} &middot; {topic.title} &middot; {lessons.length} lessons
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AssignQuestionsButton subtopicId={subtopic.id} lessonIndex={selectedLessonIdx} />
            <ReleaseToggle subtopicId={subtopic.id} initiallyReleased={subtopicReleased} />
          </div>
        </div>
      </div>

      {/* Lesson list — vertical cards like topic/subtopic menu */}
      {lessons.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-gray-700">No lesson content yet</h2>
          <p className="mt-2 text-sm text-gray-500">Lesson content has not been generated for this subtopic yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Lesson cards */}
          <div className="space-y-2">
            {lessons.map((lesson, i) => {
              const isSelected = i === selectedLessonIdx
              const isReleased = releasedLessonIds.has(lesson.id) || subtopicReleased
              return (
                <Link
                  key={lesson.id}
                  href={`/teacher/topics/${topic.id}/${subtopic.id}?lesson=${i}`}
                  className={`flex items-center gap-4 rounded-lg border p-4 transition-all ${
                    isSelected
                      ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {lesson.order_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className={`text-base font-medium truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                      {lesson.title}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Click to view lesson content
                    </p>
                  </div>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <div onClick={(e: any) => e.stopPropagation()} className="flex-shrink-0">
                    <LessonReleaseToggle
                      lessonId={lesson.id}
                      lessonTitle={lesson.title}
                      initiallyReleased={isReleased}
                    />
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Selected lesson content */}
          {selectedLesson && selectedLesson.content_json?.learning_objectives && (
            <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedLesson.title}
                </h2>
                <span className="text-xs text-gray-500">Lesson {selectedLesson.order_number}</span>
              </div>

              {/* Learning Objectives */}
              <section>
                <h3 className="text-base font-semibold text-gray-900 mb-3">Learning Objectives</h3>
                <ul className="space-y-2">
                  {selectedLesson.content_json.learning_objectives.map((obj: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 mt-0.5">{i + 1}</span>
                      {obj}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Explanation */}
              <section>
                <h3 className="text-base font-semibold text-gray-900 mb-3">Explanation</h3>
                <div className="prose prose-sm max-w-none text-gray-700">
                  {selectedLesson.content_json.explanation
                    ? renderExplanation(selectedLesson.content_json.explanation)
                    : <p className="text-gray-500 italic">No explanation available.</p>}
                </div>
              </section>

              {/* Key Points */}
              <section>
                <h3 className="text-base font-semibold text-gray-900 mb-3">Key Points</h3>
                <ul className="space-y-2">
                  {selectedLesson.content_json.key_points.map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
              </section>

              {/* Examples */}
              {selectedLesson.content_json.examples?.length > 0 && (
                <section>
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Examples</h3>
                  <div className="space-y-3">
                    {selectedLesson.content_json.examples.map((example: string, i: number) => (
                      <div key={i} className="rounded-md bg-amber-50 border border-amber-200 p-4">
                        <p className="text-xs font-medium text-amber-800 mb-1">Example {i + 1}</p>
                        <p className="text-sm text-amber-900">{example}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Misconceptions */}
              {selectedLesson.content_json.common_misconceptions?.length > 0 && (
                <section>
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Common Misconceptions</h3>
                  <div className="space-y-3">
                    {selectedLesson.content_json.common_misconceptions.map((mc: string, i: number) => (
                      <div key={i} className="rounded-md bg-red-50 border border-red-200 p-4">
                        <p className="text-xs font-medium text-red-800 mb-1">Misconception {i + 1}</p>
                        <p className="text-sm text-red-700">{mc}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
