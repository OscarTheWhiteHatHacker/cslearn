import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subtopics } = await (supabase.from('subtopics') as any)
    .select('*')
    .eq('topic_id', topicId)
    .order('order_number', { ascending: true })

  // Get lesson counts per subtopic
  const subtopicIds = ((subtopics as any[]) || []).map((s: any) => s.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lessonCounts } = await (supabase.from('lessons') as any)
    .select('subtopic_id')
    .in('subtopic_id', subtopicIds)

  const countMap = new Map<string, number>()
  if (lessonCounts) {
    for (const l of lessonCounts as { subtopic_id: string }[]) {
      countMap.set(l.subtopic_id, (countMap.get(l.subtopic_id) || 0) + 1)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enriched = ((subtopics as any[]) || []).map((s: any) => ({
    ...s,
    lessonCount: countMap.get(s.id) || 0,
  }))

  return { ...topic, subtopics: enriched }
}

export default async function TeacherTopicDetailPage({
  params,
}: {
  params: { topicId: string }
}) {
  const topic = await getTopic(params.topicId)

  if (!topic) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/teacher/topics"
          className="text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          &larr; Back to Topics
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{topic.title}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Component J277/{topic.component} &middot; {topic.subtopics.length} subtopic{topic.subtopics.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-3">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {topic.subtopics.map((subtopic: any) => (
          <Link
            key={subtopic.id}
            href={`/teacher/topics/${topic.id}/${subtopic.id}`}
            className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-300"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
              {subtopic.order_number}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-medium text-gray-900 truncate">
                {subtopic.title}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {subtopic.lessonCount > 0
                  ? `${subtopic.lessonCount} lesson${subtopic.lessonCount !== 1 ? 's' : ''}`
                  : 'No lesson content yet'}
              </p>
            </div>
            <svg className="h-5 w-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>

      {topic.subtopics.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500">No subtopics found for this topic.</p>
        </div>
      )}
    </div>
  )
}
