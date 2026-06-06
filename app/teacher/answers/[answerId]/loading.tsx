export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-24 rounded bg-gray-200" />
      <div className="h-8 w-64 rounded bg-gray-200" />
      <div className="mt-6 space-y-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="h-5 w-48 rounded bg-gray-200" />
          <div className="mt-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-md border p-4">
                <div className="h-4 w-full rounded bg-gray-200" />
                <div className="mt-2 h-4 w-3/4 rounded bg-gray-200" />
                <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
