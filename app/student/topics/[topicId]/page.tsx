'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SkeletonTopicDetail } from '@/components/Skeleton'
import { Button } from '@/components/ui/Button'

type TopicRow = {
  id: string
  component: string
  title: string
  order_number: number
}

type SubtopicRow = {
  id: string
  topic_id: string
  title: string
  order_number: number
  content_json: unknown
}

async function getTopic(topicId: string): Promise<TopicRow | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('topics')
    .select('*')
    .eq('id', topicId)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any
}

async function getReleasedSubtopics(topicId: string): Promise<SubtopicRow[]> {
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = supabase

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profileList } = await s
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const studentProfile = (profileList as any[] | null)?.[0]
  const studentOrgId = studentProfile?.organization_id

  // Find teachers in same organization
  let teacherIds: string[] = []
  if (studentOrgId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teachersInOrg } = await (s as any)
      .from('profiles')
      .select('id')
      .eq('role', 'teacher')
      .eq('organization_id', studentOrgId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    teacherIds = ((teachersInOrg as any[]) || []).map((t: any) => t.id)
  }

  if (teacherIds.length === 0) return []

  // Get released subtopic IDs for this topic
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: releasedData } = await (s as any)
    .from('released_subtopics')
    .select('subtopic_id')
    .in('teacher_id', teacherIds)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const releasedIds = new Set((releasedData as any[])?.map((r: any) => r.subtopic_id) || [])

  if (releasedIds.size === 0) return []

  // Get all subtopics for this topic that are in released set
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (s as any)
    .from('subtopics')
    .select('*')
    .eq('topic_id', topicId)
    .in('id', Array.from(releasedIds))
    .order('order_number', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]) || []
}

export default function StudentTopicDetailPage({
  params,
}: {
  params: { topicId: string }
}) {
  const [topic, setTopic] = useState<TopicRow | null>(null)
  const [subtopics, setSubtopics] = useState<SubtopicRow[]>([])
  const [notFoundState, setNotFoundState] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    document.title = 'Topic Details | CSLearn'
  }, [])

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const [t, subs] = await Promise.all([
        getTopic(params.topicId),
        getReleasedSubtopics(params.topicId),
      ])
      if (controller.signal.aborted) return
      if (!t) {
        setNotFoundState(true)
        setLoading(false)
        return
      }
      setTopic(t)
      setSubtopics(subs)
      setErrorState(null)
      setLoading(false)
    } catch (err) {
      if (controller.signal.aborted) return
      setErrorState(err instanceof Error ? err.message : 'Failed to load topic')
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.topicId])

  useEffect(() => {
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null

    load()

    // Polling fallback every 8s
    interval = setInterval(() => { if (!cancelled) load() }, 8000)

    // Supabase Realtime subscription
    const supabase = createClient()
    try {
      channel = supabase
        .channel('student-topic-detail-live')
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
  }, [params.topicId, load])

  if (loading) {
    return <SkeletonTopicDetail />
  }

  if (errorState) {
    return (
      <section className="flex flex-col items-center justify-center py-20">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-700">Failed to load topic</h2>
        <p className="mt-2 text-sm text-gray-500">{errorState}</p>
        <div className="mt-4">
          <Button
            onClick={() => { setErrorState(null); setLoading(true); load() }}
          >
            Try again
          </Button>
        </div>
      </section>
    )
  }

  if (notFoundState || !topic) {
    return (
      <section className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
        <h2 className="text-lg font-semibold text-gray-700">Topic not found</h2>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/student/topics"
            className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            &larr; Back to Topics
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{topic.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Component J277/{topic.component} &middot; {subtopics.length} released subtopic{subtopics.length !== 1 ? 's' : ''}
          </p>
        </div>
        {subtopics.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        )}
      </div>

      {subtopics.length > 0 ? (
        <div className="space-y-3">
          {subtopics.map((subtopic) => (
            <Link
              key={subtopic.id}
              href={`/student/topics/${topic.id}/${subtopic.id}`}
              className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-green-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-green-600"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-sm font-bold text-green-600 dark:bg-green-900 dark:text-green-300">
                {subtopic.order_number}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-medium text-gray-900 truncate dark:text-gray-100">
                  {subtopic.title}
                </h2>
                <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1 dark:text-green-400">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Released for study
                </p>
              </div>
              <svg className="h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-700">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-300">No subtopics released yet</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Your teacher hasn&apos;t released any subtopics for this topic yet.
          </p>
        </div>
      )}
    </section>
  )
}
