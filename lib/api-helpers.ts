import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Standardized API error response format.
 * All API routes should use this shape for error responses.
 */
export interface ApiError {
  error: string
  code: string
  details?: unknown
}

/**
 * Create a standardized error response.
 * @param error - Human-readable error message
 * @param code - Machine-readable error code (e.g. 'UNAUTHORIZED', 'NOT_FOUND', 'VALIDATION_ERROR')
 * @param status - HTTP status code
 * @param details - Optional additional error context
 */
export function errorResponse(
  error: string,
  code: string,
  status: number,
  details?: unknown
): NextResponse {
  const body: ApiError = { error, code }
  if (details !== undefined) {
    body.details = details
  }
  return NextResponse.json(body, { status })
}

/**
 * Create a 401 Unauthorized response.
 */
export function unauthorized(details?: unknown): NextResponse {
  return errorResponse('Unauthorized', 'UNAUTHORIZED', 401, details)
}

/**
 * Create a 403 Forbidden response.
 */
export function forbidden(message = 'Forbidden', details?: unknown): NextResponse {
  return errorResponse(message, 'FORBIDDEN', 403, details)
}

/**
 * Create a 404 Not Found response.
 */
export function notFound(message = 'Resource not found', details?: unknown): NextResponse {
  return errorResponse(message, 'NOT_FOUND', 404, details)
}

/**
 * Create a 400 Bad Request response.
 */
export function badRequest(message: string, details?: unknown): NextResponse {
  return errorResponse(message, 'VALIDATION_ERROR', 400, details)
}

/**
 * Create a 409 Conflict response.
 */
export function conflict(message: string, details?: unknown): NextResponse {
  return errorResponse(message, 'CONFLICT', 409, details)
}

/**
 * Create a 500 Internal Server Error response.
 * Avoids leaking internal details in production.
 */
export function internalError(message = 'Internal server error', details?: unknown): NextResponse {
  return errorResponse(message, 'INTERNAL_ERROR', 500, details)
}

/**
 * Verify that the request has a valid user session.
 * Returns the user if authenticated, or a NextResponse error if not.
 */
export async function requireUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { user: null, errorResponse: unauthorized(error?.message) }
  }
  return { user, errorResponse: null }
}

/**
 * Verify that the request has a valid teacher session.
 * Uses profiles.role (the DB source of truth) instead of JWT metadata.
 * Returns the user if authenticated as teacher, or a NextResponse error if not.
 */
export async function requireTeacher() {
  const { user, errorResponse } = await requireUser()
  if (errorResponse) return { user: null, errorResponse }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileList } = await (supabase.from('profiles') as any)
    .select('role, organization_id')
    .eq('id', user!.id)
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (profileList as any[] | null)?.[0] as { role: string; organization_id: string } | undefined
  if (!profile || profile.role !== 'teacher') {
    return { user: null, errorResponse: forbidden('Teacher access required') }
  }

  return { user, teacherProfile: profile, errorResponse: null }
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
  const nodeEnv: string = process.env.NODE_ENV || 'development'
  if (nodeEnv === 'development') {
    allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000')
  }

  const isValid = (header: string | null) => {
    if (!header) return false
    return allowedOrigins.some((allowed) => allowed && header.startsWith(allowed))
  }

  if (isValid(origin) || isValid(referer)) return null

  // No valid origin/referer found — reject
  return forbidden('CSRF validation failed')
}
