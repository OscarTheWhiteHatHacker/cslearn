'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/components/supabase-provider'
import { SkeletonDashboard } from '@/components/Skeleton'
import { Button } from '@/components/ui/Button'

interface Subject {
  id: string
  name: string
  slug: string
  description: string
  price_pence: number
}

interface TeacherProfile {
  id: string
  full_name: string
}

interface OrgPurchase {
  subject_id: string
}

interface TeacherAccess {
  teacher_id: string
  subject_id: string
}

interface SubjectsPageData {
  isOrgAdmin: boolean
  orgId: string | null
  subjects: Subject[]
  purchases: OrgPurchase[]
  accesses: TeacherAccess[]
  teachers: TeacherProfile[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchSubjectsData(supabase: any, userId: string): Promise<SubjectsPageData | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = supabase

  // Get user profile
  const { data: profileList } = await s
    .from('profiles')
    .select('role, organization_id')
    .eq('id', userId)
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (profileList as any[] | null)?.[0]
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'org_admin')) {
    return null
  }

  const isOrgAdmin = profile.role === 'org_admin'
  const orgId = profile.organization_id

  if (!orgId) {
    return {
      isOrgAdmin,
      orgId: null,
      subjects: [],
      purchases: [],
      accesses: [],
      teachers: [],
    }
  }

  // Fetch all subjects, org purchases, teacher access, and teachers in parallel
  const [subjectsResult, purchasesResult, accessResult, teachersResult] = await Promise.all([
    s.from('subjects').select('*').order('name', { ascending: true }),
    s.from('org_purchases').select('subject_id').eq('org_id', orgId),
    s.from('subject_teacher_access').select('teacher_id, subject_id'),
    s.from('profiles')
      .select('id, full_name')
      .eq('organization_id', orgId)
      .in('role', ['teacher', 'org_admin'])
      .order('full_name', { ascending: true }),
  ])

  return {
    isOrgAdmin,
    orgId,
    subjects: (subjectsResult?.data as Subject[]) || [],
    purchases: (purchasesResult?.data as OrgPurchase[]) || [],
    accesses: (accessResult?.data as TeacherAccess[]) || [],
    teachers: (teachersResult?.data as TeacherProfile[]) || [],
  }
}

export default function TeacherSubjectsPage() {
  const router = useRouter()
  const { supabase, isLoading: authLoading, user: authUser } = useSupabase()
  const [data, setData] = useState<SubjectsPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorState, setErrorState] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const [promoCodes, setPromoCodes] = useState<Record<string, string>>({})
  const [applyingPromo, setApplyingPromo] = useState<Record<string, boolean>>({})
  const [promoMessage, setPromoMessage] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({})
  const [buyingSubject, setBuyingSubject] = useState<Record<string, boolean>>({})
  const [togglingAccess, setTogglingAccess] = useState<Record<string, boolean>>({})
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    document.title = 'Manage Subjects | CSLearn'
  }, [])

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      if (!authUser) {
        setUnauthorized(true)
        setLoading(false)
        return
      }
      const result = await fetchSubjectsData(supabase, authUser.id)
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
      const msg = err instanceof Error ? err.message : 'Failed to load data'
      console.error('[Subjects] fetch error:', err)
      setErrorState(msg)
      setLoading(false)
    }
  }, [supabase, authUser])

  const handleRetry = useCallback(() => {
    setErrorState(null)
    setLoading(true)
    load()
  }, [load])

  useEffect(() => {
    if (authLoading) return
    load()

    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, authLoading])

  const handleBuy = async (subjectId: string) => {
    setBuyingSubject((prev) => ({ ...prev, [subjectId]: true }))
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId }),
      })
      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error || 'Failed to create checkout session')
      }
      // Redirect to Stripe Checkout
      if (result.url) {
        window.location.href = result.url
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      alert(msg)
    } finally {
      setBuyingSubject((prev) => ({ ...prev, [subjectId]: false }))
    }
  }

  const handleApplyPromo = async (subjectId: string) => {
    const code = promoCodes[subjectId]
    if (!code || !code.trim()) return

    setApplyingPromo((prev) => ({ ...prev, [subjectId]: true }))
    setPromoMessage((prev) => ({ ...prev, [subjectId]: undefined as any }))

    try {
      const res = await fetch('/api/apply-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectId, promoCode: code.trim() }),
      })
      const result = await res.json()
      if (!res.ok) {
        setPromoMessage((prev) => ({
          ...prev,
          [subjectId]: { type: 'error', text: result.error || 'Invalid promo code' },
        }))
      } else {
        setPromoMessage((prev) => ({
          ...prev,
          [subjectId]: { type: 'success', text: result.message },
        }))
        // Reload data to reflect the purchase
        load()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setPromoMessage((prev) => ({
        ...prev,
        [subjectId]: { type: 'error', text: msg },
      }))
    } finally {
      setApplyingPromo((prev) => ({ ...prev, [subjectId]: false }))
    }
  }

  const handleToggleAccess = async (teacherId: string, subjectId: string, grant: boolean) => {
    const key = `${teacherId}_${subjectId}`
    setTogglingAccess((prev) => ({ ...prev, [key]: true }))

    try {
      const res = await fetch('/api/set-teacher-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, subjectId, grant }),
      })
      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error || 'Failed to set access')
      }
      // Reload to reflect changes
      load()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      alert(msg)
    } finally {
      setTogglingAccess((prev) => ({ ...prev, [key]: false }))
    }
  }

  if (authLoading) {
    return <SkeletonDashboard />
  }

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
        <h2 className="mt-4 text-lg font-semibold text-gray-700">Failed to load</h2>
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

  const { subjects, purchases, accesses, teachers, isOrgAdmin } = data
  const purchasedSubjectIds = new Set(purchases.map((p) => p.subject_id))

  // Build a lookup for access: teacher_id -> Set of subject_ids
  const accessMap = new Map<string, Set<string>>()
  for (const a of accesses) {
    if (!accessMap.has(a.teacher_id)) {
      accessMap.set(a.teacher_id, new Set())
    }
    accessMap.get(a.teacher_id)!.add(a.subject_id)
  }

  // Only show the Teacher Access section if user is org_admin
  const purchasedSubjects = subjects.filter((s) => purchasedSubjectIds.has(s.id))

  if (!isOrgAdmin) {
    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Subjects</h1>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-950">
          <p className="text-yellow-800 dark:text-yellow-200">
            Only organisation admins can manage subjects. Please contact your organisation administrator.
          </p>
        </div>
      </section>
    )
  }

  if (!data.orgId) {
    return (
      <section className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Subjects</h1>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-800 dark:bg-yellow-950">
          <p className="text-yellow-800 dark:text-yellow-200">
            You need to belong to an organisation to manage subjects.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Manage Subjects</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Purchase subject access for your organisation and manage teacher permissions.
          </p>
        </div>
      </div>

      {/* Subjects List */}
      <div className="grid gap-6 md:grid-cols-2">
        {subjects.length === 0 && (
          <div className="col-span-full rounded-lg border bg-white p-12 text-center shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No subjects available.</p>
          </div>
        )}

        {subjects.map((subject) => {
          const isPurchased = purchasedSubjectIds.has(subject.id)
          const priceFormatted = (subject.price_pence / 100).toFixed(2)

          return (
            <div
              key={subject.id}
              className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-800 dark:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {subject.name}
                  </h2>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {subject.description}
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Price: £{priceFormatted}
                  </p>
                </div>
                <div className="ml-4 flex flex-col items-end gap-2">
                  {isPurchased ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300">
                      <svg className="mr-1 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Purchased
                    </span>
                  ) : (
                    <div className="flex flex-col items-end gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        loading={buyingSubject[subject.id]}
                        onClick={() => handleBuy(subject.id)}
                      >
                        Buy £{priceFormatted}
                      </Button>
                      {/* Promo code input */}
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          placeholder="Promo code"
                          value={promoCodes[subject.id] || ''}
                          onChange={(e) =>
                            setPromoCodes((prev) => ({ ...prev, [subject.id]: e.target.value }))
                          }
                          className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          loading={applyingPromo[subject.id]}
                          onClick={() => handleApplyPromo(subject.id)}
                        >
                          Apply
                        </Button>
                      </div>
                      {promoMessage[subject.id] && (
                        <p
                          className={`text-xs ${
                            promoMessage[subject.id].type === 'success'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {promoMessage[subject.id].text}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Teacher Access Section */}
      {purchasedSubjects.length > 0 && (
        <div className="rounded-lg border bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="border-b bg-gray-50 px-6 py-4 dark:bg-gray-800 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Teacher Access</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage which teachers can access each purchased subject.
            </p>
          </div>

          {teachers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">No teachers found in your organisation.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    >
                      Teacher
                    </th>
                    {purchasedSubjects.map((subject) => (
                      <th
                        key={subject.id}
                        scope="col"
                        className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                      >
                        {subject.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {teachers.map((teacher) => {
                    const teacherAccess = accessMap.get(teacher.id) || new Set()
                    return (
                      <tr key={teacher.id} className="hover:bg-blue-50/50 transition-colors dark:hover:bg-gray-700/50">
                        <td className="sticky left-0 bg-white px-6 py-4 whitespace-nowrap border-r border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                              {teacher.full_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {teacher.full_name}
                            </p>
                          </div>
                        </td>
                        {purchasedSubjects.map((subject) => {
                          const hasAccess = teacherAccess.has(subject.id)
                          const toggleKey = `${teacher.id}_${subject.id}`
                          const isToggling = togglingAccess[toggleKey]
                          return (
                            <td key={subject.id} className="px-4 py-4 text-center">
                              <button
                                type="button"
                                disabled={isToggling}
                                onClick={() => handleToggleAccess(teacher.id, subject.id, !hasAccess)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 ${
                                  hasAccess
                                    ? 'bg-accent'
                                    : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                                role="switch"
                                aria-checked={hasAccess}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    hasAccess ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
