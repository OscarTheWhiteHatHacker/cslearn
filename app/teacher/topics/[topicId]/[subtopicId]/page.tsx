import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import SubtopicClient from './subtopic-client'

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [subtopicResult, topicResult, lessonsResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('subtopics') as any).select('*').eq('id', subtopicId).limit(1),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('topics') as any).select('*').eq('id', topicId).limit(1),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('lessons') as any).select('*').eq('subtopic_id', subtopicId).order('order_number'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subtopic = (subtopicResult.data as any[] | null)?.[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topic = (topicResult.data as any[] | null)?.[0]
  const lessons: Lesson[] = (lessonsResult.data as Lesson[]) || []

  let subtopicReleased = false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let releasedLessonIds: any = []

  if (user) {
    const [releaseResult, lessonIdsResult] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('released_subtopics') as any).select('id').eq('subtopic_id', subtopicId).eq('teacher_id', user.id).limit(1),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('released_lessons') as any).select('lesson_id').eq('teacher_id', user.id),
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subtopicReleased = ((releaseResult.data as any[] | null)?.length || 0) > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    releasedLessonIds = (lessonIdsResult.data as any[] || []).map((r: any) => r.lesson_id)
  }

  return { subtopic, topic, lessons, subtopicReleased, releasedLessonIds, subtopicId }
}

export default async function TeacherSubtopicPage({
  params,
}: {
  params: { topicId: string; subtopicId: string }
}) {
  const data = await getPageData(params.subtopicId, params.topicId)

  if (!data.subtopic || !data.topic) notFound()

  return <SubtopicClient {...data} />
}
