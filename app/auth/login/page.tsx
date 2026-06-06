'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import ThemeToggle from '@/components/ThemeToggle'
import Logo from '@/components/Logo'
import Link from 'next/link'

type LoginRole = 'student' | 'teacher' | null

export default function LoginPage() {
  const [role, setRole] = useState<LoginRole>(null)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    document.title = 'Sign In | CSLearn'
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setRateLimitRemaining(null)

    try {
      let loginEmail: string | null = null

      if (role === 'student') {
        if (!username.trim()) {
          setError('Invalid credentials')
          setLoading(false)
          return
        }

        // Look up email from profiles by username
        try {
          const lookupRes = await fetch('/api/lookup-username', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username.trim().toLowerCase() }),
          })
          if (lookupRes.ok) {
            const lookupData = await lookupRes.json()
            loginEmail = lookupData.email
          }

          const remaining = lookupRes.headers.get('X-RateLimit-Remaining')
          if (remaining) {
            setRateLimitRemaining(parseInt(remaining, 10))
          }
        } catch {
          // fall through
        }

        if (!loginEmail) {
          setError('Invalid credentials')
          setLoading(false)
          return
        }
      } else {
        // Teacher — use email directly
        if (!email.trim()) {
          setError('Invalid credentials')
          setLoading(false)
          return
        }
        loginEmail = email.trim()
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (error) {
        setError('Invalid credentials')
        setLoading(false)
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Invalid credentials')
      setLoading(false)
    }
  }

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Theme toggle */}
      <div className="absolute right-4 top-4 z-50">
        <ThemeToggle />
      </div>
      {/* Subtle background pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_70%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-50/20 to-transparent" />

      <div className="relative w-full max-w-md space-y-8">
        <div className="text-center">
          <Logo className="mx-auto h-36 w-auto mb-4" />
          <h1 className="text-gray-600 text-lg font-medium">Sign in with your {role === 'teacher' ? 'email' : 'username'}</h1>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {rateLimitRemaining !== null && rateLimitRemaining <= 5 && (
            <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
              {rateLimitRemaining <= 0
                ? 'Too many login attempts. Please try again later.'
                : `${rateLimitRemaining} login attempt${rateLimitRemaining === 1 ? '' : 's'} remaining before rate limit.`}
            </div>
          )}

          {/* Role selector - shown first */}
          {!role && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Who are you?</h2>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className="w-full rounded-lg border border-gray-300 bg-white p-4 text-left transition-all hover:border-accent hover:bg-accent-bg/50 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">I&apos;m a student</p>
                      <p className="text-sm text-gray-500">Sign in with your username</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className="w-full rounded-lg border border-gray-300 bg-white p-4 text-left transition-all hover:border-accent hover:bg-accent-bg/50 focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                      <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">I&apos;m a teacher</p>
                      <p className="text-sm text-gray-500">Sign in with your email</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Student login fields */}
          {role === 'student' && (
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm bg-[var(--input-bg)] text-[var(--input-text)]"
                placeholder="your username"
              />
            </div>
          )}

          {/* Teacher login fields */}
          {role === 'teacher' && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm bg-[var(--input-bg)] text-[var(--input-text)]"
                placeholder="john@school.edu"
              />
            </div>
          )}

          {/* Password (shown after role is selected) */}
          {role && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-accent focus:outline-none focus:ring-accent sm:text-sm bg-[var(--input-bg)] text-[var(--input-text)]"
                placeholder="••••••••"
              />
            </div>
          )}

          {/* Submit / Back buttons */}
          {role && (
            <>
              <Button
                type="submit"
                loading={loading}
                loadingText="Signing in..."
                className="w-full"
              >
                Sign in
              </Button>
              <button
                type="button"
                onClick={() => { setRole(null); setError(null); setUsername(''); setEmail(''); setPassword(''); setRateLimitRemaining(null) }}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
              >
                &larr; Choose a different role
              </button>
            </>
          )}

          {!role && (
            <p className="text-center text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className="font-medium text-accent hover:text-accent">
                Sign up
              </Link>
            </p>
          )}
        </form>
      </div>
    </section>
  )
}
