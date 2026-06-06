import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import NavLink from '@/components/NavLink'
import ThemeToggle from '@/components/ThemeToggle'
import type { Database } from '@/lib/supabase/database.types'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const typedProfile = profile as Database['public']['Tables']['profiles']['Row'] | null
  if (!typedProfile) {
    // Profile was deleted (e.g. DB wipe) - sign out
    await supabase.auth.signOut()
    redirect('/auth/login')
  }
  if (typedProfile.role !== 'student') {
    redirect('/teacher')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white shadow-sm dark:bg-gray-900 dark:border-gray-700">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/student" className="flex items-center gap-2">
              <img src="/logo.svg" alt="CSLearn" className="h-12 w-auto" />
            </Link>
            <nav className="hidden sm:flex items-center gap-1" aria-label="Main navigation">
              <div className="px-3 py-2">
                <NavLink href="/student" exact>Dashboard</NavLink>
              </div>
              <div className="px-3 py-2">
                <NavLink href="/student/topics">Topics</NavLink>
              </div>
              <div className="px-3 py-2">
                <NavLink href="/student/questions">Questions</NavLink>
              </div>
            </nav>
            {/* Mobile nav */}
            <nav className="flex sm:hidden items-center gap-3" aria-label="Mobile navigation">
              <Link href="/student" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">D</Link>
              <Link href="/student/topics" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">T</Link>
              <Link href="/student/questions" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">Q</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
