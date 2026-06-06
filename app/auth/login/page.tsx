'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import ThemeToggle from '@/components/ThemeToggle'
import Logo from '@/components/Logo'
import Link from 'next/link'

export default function LoginPage() {
  const [username, setUsername] = useState('')
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
      if (!username.trim()) {
        setError('Invalid credentials')
        setLoading(false)
        return
      }

      // Look up the email from profiles by username via server API (no auth required)
      let loginEmail: string | null = null
      try {
        const lookupRes = await fetch('/api/lookup-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim().toLowerCase(),
          }),
        })
        if (lookupRes.ok) {
          const lookupData = await lookupRes.json()
          loginEmail = lookupData.email
        }

        // Check for rate limit headers
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

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (error) {
        // Always show generic error to prevent username enumeration
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
          <h1 className="text-gray-600 text-lg font-medium">Sign in with your username</h1>
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

          <Button
            type="submit"
            loading={loading}
            loadingText="Signing in..."
            className="w-full"
          >
            Sign in
          </Button>

          <p className="text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="font-medium text-accent hover:text-accent">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </section>
  )
}
