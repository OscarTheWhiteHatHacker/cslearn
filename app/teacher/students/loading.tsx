export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded bg-gray-200" />
        <div className="h-6 w-24 rounded bg-gray-200" />
      </div>
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-200" />
                <div>
                  <div className="h-4 w-32 rounded bg-gray-200" />
                  <div className="mt-1 h-3 w-20 rounded bg-gray-200" />
                </div>
              </div>
              <div className="h-6 w-16 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
