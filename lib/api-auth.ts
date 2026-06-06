import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Verify that the request has a valid user session.
 * Returns the user if authenticated, or a NextResponse error if not.
 */
export async function requireUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null, errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { user, errorResponse: null }
}

/**
 * Verify that the request has a valid teacher session.
 * Returns the user if authenticated as teacher, or a NextResponse error if not.
 */
export async function requireTeacher() {
  const { user, errorResponse } = await requireUser()
  if (errorResponse) return { user: null, errorResponse }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileList } = await (supabase.from('profiles') as any)
    .select('role')
    .eq('id', user!.id)
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (profileList as any[] | null)?.[0]
  if (!profile || profile.role !== 'teacher') {
    return { user: null, errorResponse: NextResponse.json({ error: 'Forbidden: teachers only' }, { status: 403 }) }
  }

  return { user, errorResponse: null }
}

/**
 * CSRF protection via Origin/Referer header check.
 * Call this on state-changing (POST/PUT/PATCH/DELETE) API routes.
 */
export function csrfProtection(request: Request): NextResponse | null {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  const allowedOrigins = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
  ].filter(Boolean).map((u) => {
    let normalized = (u || '').replace(/\/+$/, '')
    if (normalized && !normalized.startsWith('http')) {
      normalized = `https://${normalized}`
    }
    return normalized
  })

  // In development, allow localhost
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const nodeEnv: string = (process.env as any).NODE_ENV || 'development'
  if (nodeEnv === 'development') {
    allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000')
  }

  const isValid = (header: string | null) => {
    if (!header) return false
    return allowedOrigins.some((allowed) => allowed && header.startsWith(allowed))
  }

  if (isValid(origin) || isValid(referer)) return null

  // No valid origin/referer found — reject
  return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 })
}
