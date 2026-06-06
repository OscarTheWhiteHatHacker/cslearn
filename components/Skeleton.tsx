/**
 * Reusable skeleton loading components that match the final layout shapes.
 */

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg border bg-white p-6 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="mt-3 h-5 w-3/4 rounded bg-gray-200" />
          <div className="mt-2 h-3 w-1/2 rounded bg-gray-200" />
        </div>
        <div className="h-12 w-12 rounded-full bg-gray-200" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 4, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse rounded-lg border bg-white shadow-sm">
      <div className="border-b bg-gray-50 px-6 py-4">
        <div className="h-5 w-40 rounded bg-gray-200" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-3 w-16 rounded bg-gray-200" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-4 py-4">
                    <div className="h-4 w-full rounded bg-gray-100" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />
}

export function SkeletonStatCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="animate-pulse rounded-lg border bg-white p-5 shadow-sm">
          <div className="h-3 w-20 rounded bg-gray-200" />
          <div className="mt-3 h-8 w-12 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-56 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-200" />
      </div>
      <SkeletonStatCards />
      <SkeletonTable rows={4} cols={5} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}

export function SkeletonStudentTopics() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-40 animate-pulse rounded bg-gray-200" />
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}

export function SkeletonStudentQuestions() {
  return (
    <div className="space-y-6">
      <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg border bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-5 w-3/4 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-1/2 rounded bg-gray-200" />
                <div className="mt-3 flex gap-2">
                  <div className="h-5 w-20 rounded-full bg-gray-200" />
                  <div className="h-5 w-16 rounded-full bg-gray-200" />
                </div>
              </div>
              <div className="h-6 w-24 rounded-full bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonTopicDetail() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
      <div className="h-7 w-64 animate-pulse rounded bg-gray-200" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-lg border bg-white p-4 shadow-sm"
          />
        ))}
      </div>
    </div>
  )
}

export function SkeletonStudentDetail() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
      <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border bg-white p-4 shadow-sm"
          />
        ))}
      </div>
    </div>
  )
}
