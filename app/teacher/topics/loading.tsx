export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded bg-gray-200" />
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-lg border bg-white p-6 shadow-sm">
            <div className="h-4 w-16 rounded bg-gray-200" />
            <div className="mt-3 h-6 w-48 rounded bg-gray-200" />
            <div className="mt-3 h-4 w-32 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  )
}
