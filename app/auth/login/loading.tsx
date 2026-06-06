export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-gray-200" />
        <div className="mx-auto mt-4 h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mx-auto mt-2 h-4 w-64 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  )
}
