import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TopicClient from './topic-client'

export const metadata: Metadata = {
  title: 'Topic Details',
}

async function getTopic(topicId: string) {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: topicData } = await (supabase.from('topics') as any)
    .select('*')
    .eq('id', topicId)
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topic = (topicData as any[] | null)?.[0]
  if (!topic) return null

  // Get subtopics with lesson data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subtopics } = await (supabase.from('subtopics') as any)
    .select('*')
    .eq('topic_id', topicId)
    .order('order_number', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subtopicIds = ((subtopics as any[]) || []).map((s: any) => s.id)

  // Get lessons for all subtopics
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allLessons } = await (supabase.from('lessons') as any)
    .select('*')
    .in('subtopic_id', subtopicIds)
    .order('order_number')

  // Group lessons by subtopic
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lessonsBySubtopic: Record<string, any[]> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const l of (allLessons || []) as any[]) {
    if (!lessonsBySubtopic[l.subtopic_id]) lessonsBySubtopic[l.subtopic_id] = []
    lessonsBySubtopic[l.subtopic_id].push(l)
  }

  // Check release status
  const { data: { user } } = await supabase.auth.getUser()
  let lessonReleaseIds: string[] = []
  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: released } = await (supabase.from('released_lessons') as any)
      .select('lesson_id')
      .eq('teacher_id', user.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lessonReleaseIds = ((released as any[]) || []).map((r: any) => r.lesson_id)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched = ((subtopics as any[]) || []).map((s: any) => ({
    ...s,
    lessons: lessonsBySubtopic[s.id] || [],
    lessonCount: (lessonsBySubtopic[s.id] || []).length,
  }))

  return {
    ...topic,
    subtopics: enriched,
    lessonReleaseIds,
  }
}

export default async function TeacherTopicDetailPage({
  params,
}: {
  params: { topicId: string }
}) {
  const topicData = await getTopic(params.topicId)

  if (!topicData) notFound()

  return <TopicClient topicData={topicData} />
}
