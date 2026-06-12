'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SkeletonStudentTopics } from '@/components/Skeleton'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'

type TopicSummary = {
  id: string
  component: '01' | '02'
  title: string
  order_number: number
  subtopic_count: number
}

async function getReleasedTopics(): Promise<TopicSummary[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = supabase

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Get all released lesson IDs (RLS handles scoping)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: released } = await (s as any)
    .from('released_lessons')
    .select('lesson_id')

  if (!released || released.length === 0) return []

  const releasedLessonIds = (released as { lesson_id: string }[]).map(r => r.lesson_id)

  // Find which subtopics have released lessons
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: releasedSubtopics } = await (s as any)
    .from('lessons')
    .select('subtopic_id')
    .in('id', releasedLessonIds)

  if (!releasedSubtopics || releasedSubtopics.length === 0) return []

  const subtopicIds = Array.from(new Set((releasedSubtopics as { subtopic_id: string }[]).map(l => l.subtopic_id)))

  // Find which topics those subtopics belong to
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subs } = await (s as any)
    .from('subtopics')
    .select('id, topic_id')
    .in('id', subtopicIds)

  if (!subs || subs.length === 0) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topicIds = Array.from(new Set((subs as any[]).map((s: any) => s.topic_id)))

  if (topicIds.length === 0) return []

  // Get topics that have released content
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: topics } = await (s as any)
    .from('topics')
    .select(`id, component, title, order_number`)
    .in('id', topicIds)
    .order('order_number', { ascending: true })

  // Build subtopic counts per topic
  const countByTopic: Record<string, number> = {}
  const uniqueSubtopics = Array.from(new Set((releasedSubtopics as { subtopic_id: string }[]).map(l => l.subtopic_id)))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const sub of (subs as any[])) {
    if (uniqueSubtopics.includes(sub.id)) {
      countByTopic[sub.topic_id] = (countByTopic[sub.topic_id] || 0) + 1
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((topics as any[]) || []).map((t: any) => ({
    id: t.id,
    component: t.component,
    title: t.title,
    order_number: t.order_number,
    subtopic_count: countByTopic[t.id] || 0,
  }))
}

export default function StudentTopicsPage() {
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    document.title = 'My Topics | CSLearn'
  }, [])

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await getReleasedTopics()
      if (controller.signal.aborted) return
      setTopics(result)
      setErrorState(null)
      setLoading(false)
    } catch (err) {
      if (controller.signal.aborted) return
      setErrorState(err instanceof Error ? err.message : 'Failed to load topics')
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null

    load()

    // Polling fallback every 8s
    interval = setInterval(() => {
      if (!cancelled) load()
    }, 8000)

    // Supabase Realtime subscription
    const supabase = createClient()
    try {
      channel = supabase
        .channel('student-topics-live')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'released_subtopics' },
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
    return <SkeletonStudentTopics />
  }

  if (errorState) {
    return (
      <ErrorState
        title="Failed to load topics"
        message={errorState}
        onRetry={() => { setErrorState(null); setLoading(true); load() }}
      />
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Topics</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Browse topics released by your teacher and start learning.
          </p>
        </div>
        {topics.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {topics.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              href={`/student/topics/${topic.id}`}
              className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-blue-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-blue-600"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300">
                    J277/{topic.component}
                  </span>
                  <h2 className="mt-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
                    {topic.title}
                  </h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-sm font-bold text-green-600 dark:bg-green-900 dark:text-green-300">
                  {topic.subtopic_count}
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {topic.subtopic_count} released subtopic{topic.subtopic_count !== 1 ? 's' : ''}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No topics released yet"
          description="Your teacher hasn't released any topics for you to study yet. Check back later!"
        />
      )}
    </section>
  )
}
