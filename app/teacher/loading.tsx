export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <div className="h-12 w-24 animate-pulse rounded bg-gray-200" />
            <div className="hidden sm:flex items-center gap-1">
              <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
              <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
              <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-9 w-20 animate-pulse rounded bg-gray-200" />
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded bg-gray-200" />
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-32 rounded-lg border bg-white p-6 shadow-sm">
                <div className="h-4 w-16 rounded bg-gray-200" />
                <div className="mt-3 h-6 w-48 rounded bg-gray-200" />
                <div className="mt-3 h-4 w-32 rounded bg-gray-200" />
              </div>
              <div className="h-32 rounded-lg border bg-white p-6 shadow-sm">
                <div className="h-4 w-16 rounded bg-gray-200" />
                <div className="mt-3 h-6 w-48 rounded bg-gray-200" />
                <div className="mt-3 h-4 w-32 rounded bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
