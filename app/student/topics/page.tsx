'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

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
    const { data: teachersInOrg } = await s
      .from('profiles')
      .select('id')
      .eq('role', 'teacher')
      .eq('organization_id', studentOrgId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    teacherIds = ((teachersInOrg as any[]) || []).map((t: any) => t.id)
  }

  // Get all released subtopics by teachers in this org
  let releasedQuery = s
    .from('released_subtopics')
    .select(`
      subtopic_id,
      subtopics!inner (
        topic_id,
        topics!inner (
          id,
          component,
          title,
          order_number
        )
      )
    `)

  if (teacherIds.length > 0) {
    releasedQuery = releasedQuery.in('teacher_id', teacherIds)
  }

  const { data: releasedData } = await releasedQuery

  if (!releasedData || releasedData.length === 0) return []

  // De-duplicate topics
  const topicMap = new Map<string, TopicSummary>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of releasedData as any[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topic = (item as any).subtopics?.topics
    if (topic) {
      const key = topic.id
      if (topicMap.has(key)) {
        topicMap.get(key)!.subtopic_count++
      } else {
        topicMap.set(key, {
          id: topic.id,
          component: topic.component,
          title: topic.title,
          order_number: topic.order_number,
          subtopic_count: 1,
        })
      }
    }
  }

  return Array.from(topicMap.values()).sort((a, b) => a.order_number - b.order_number)
}

export default function StudentTopicsPage() {
  const [topics, setTopics] = useState<TopicSummary[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const result = await getReleasedTopics()
    setTopics(result)
    setLoading(false)
  }

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
      if (interval) clearInterval(interval)
      if (channel) supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">My Topics</h1>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg border bg-white p-6 shadow-sm" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Topics</h1>
          <p className="mt-1 text-gray-600">
            Browse topics released by your teacher and start learning.
          </p>
        </div>
        {topics.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
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
              className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-blue-300"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    J277/{topic.component}
                  </span>
                  <h2 className="mt-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                    {topic.title}
                  </h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-sm font-bold text-green-600">
                  {topic.subtopic_count}
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                {topic.subtopic_count} released subtopic{topic.subtopic_count !== 1 ? 's' : ''}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-gray-700">No topics released yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            Your teacher hasn&apos;t released any topics for you to study yet. Check back later!
          </p>
        </div>
      )}
    </div>
  )
}
