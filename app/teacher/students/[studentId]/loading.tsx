export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-24 rounded bg-gray-200" />
      <div className="mt-4 space-y-4">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="mt-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div>
                  <div className="h-4 w-48 rounded bg-gray-200" />
                  <div className="mt-1 h-3 w-32 rounded bg-gray-200" />
                </div>
                <div className="h-6 w-20 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
