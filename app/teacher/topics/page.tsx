import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { EmptyState } from '@/components/EmptyState'
import SubjectSelector from './subject-selector'

export const metadata: Metadata = {
  title: 'Topics Management',
}

export default async function TeacherTopicsPage({
  searchParams,
}: {
  searchParams: { subject?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileList } = await (supabase.from('profiles') as any)
    .select('organization_id')
    .eq('id', user.id)
    .limit(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (profileList as any[] | null)?.[0]
  const orgId = profile?.organization_id

  if (!orgId) {
    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Topics Management</h1>
        <p className="text-gray-600 dark:text-gray-400">You need to be part of an organization to manage topics.</p>
      </section>
    )
  }

  // Get subjects the org has purchased
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: purchases } = await (supabase.from('org_purchases') as any)
    .select('subject_id')
    .eq('org_id', orgId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const purchasedIds = new Set((purchases || []).map((p: any) => p.subject_id))

  // Get subjects the teacher has access to
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: accessRows } = await (supabase.from('subject_teacher_access') as any)
    .select('subject_id')
    .eq('teacher_id', user.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accessibleIds = new Set((accessRows || []).map((a: any) => a.subject_id))

  // Intersect purchased + accessible
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validSubjectIds = Array.from(purchasedIds).filter((id: any) => accessibleIds.has(id))

  if (validSubjectIds.length === 0) {
    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Topics Management</h1>
        <EmptyState
          title="No subjects available"
          description="Your organization hasn't purchased any subjects yet, or you haven't been granted access."
        />
      </section>
    )
  }

  // Get subject details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subjects } = await (supabase.from('subjects') as any)
    .select('*')
    .in('id', validSubjectIds)
    .order('name', { ascending: true })

  // Select the active subject from search params or default to first
  const activeSubjectId = searchParams.subject || (subjects as any[])?.[0]?.id || ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeSubject = (subjects as any[] || []).find((s: any) => s.id === activeSubjectId)

  // Get topics for the active subject
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: topics } = await (supabase.from('topics') as any)
    .select('*')
    .eq('subject_id', activeSubjectId)
    .order('order_number', { ascending: true })

  // Get subtopic counts for each topic
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topicsWithCounts = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (topics || []).map(async (topic: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase.from('subtopics') as any)
        .select('*', { count: 'exact', head: true })
        .eq('topic_id', topic.id)
      return { ...topic, subtopic_count: count || 0 }
    })
  )

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Topics Management</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage curriculum topics, subtopics, and release them to students.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {topicsWithCounts.length} topics
          </span>
        </div>
      </div>

      {/* Subject selector */}
      <SubjectSelector
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subjects={(subjects as any[]) || []}
        activeSubjectId={activeSubjectId}
      />

      {/* Topics grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {topicsWithCounts.map((topic) => {
          const specCode = activeSubject?.slug === 'computer-science'
            ? `J277/${topic.component}`
            : topic.component || activeSubject?.slug?.substring(0, 4)?.toUpperCase()
          return <Link
            key={topic.id}
            href={`/teacher/topics/${topic.id}`}
            className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-blue-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-blue-600"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  {specCode}
                </span>
                <h2 className="mt-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
                  {topic.title}
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                {topic.subtopic_count}
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {topic.subtopic_count} subtopic{topic.subtopic_count !== 1 ? 's' : ''}
            </p>
          </Link>
        })}
      </div>

      {topicsWithCounts.length === 0 && (
        <EmptyState
          title="No topics found"
          description="This subject has no topics yet."
        />
      )}
    </section>
  )
}
