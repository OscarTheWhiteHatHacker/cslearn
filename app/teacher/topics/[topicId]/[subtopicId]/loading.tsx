export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-24 rounded bg-gray-200" />
      <div className="h-8 w-64 rounded bg-gray-200" />
      <div className="mt-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 rounded-lg border bg-white p-6 shadow-sm">
            <div className="h-5 w-48 rounded bg-gray-200" />
            <div className="mt-2 h-4 w-24 rounded bg-gray-200" />
            <div className="mt-3 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-gray-200" />
              <div className="h-6 w-16 rounded-full bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
