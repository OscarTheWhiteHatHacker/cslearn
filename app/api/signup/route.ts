import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'

/**
 * Zod schema for signup request body validation.
 */
const signupSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(50, 'Username must be 50 characters or less')
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character (e.g. !@#$%^&*)'),
  fullName: z.string().min(1, 'Full name is required').max(100, 'Full name must be 100 characters or less'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  role: z.enum(['student', 'teacher', 'org_admin']),
  orgSlug: z.string().max(100).optional().default(''),
  orgAction: z.enum(['create', 'join']).optional(),
  orgName: z.string().max(200).optional().default(''),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate with Zod
    const validationResult = signupSchema.safeParse(body)

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]
      return NextResponse.json(
        { error: firstError?.message || 'Invalid request body' },
        { status: 400 },
      )
    }

    const { username, password, fullName, role, email, orgSlug, orgAction, orgName } = validationResult.data

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabase = createServerClient(supabaseUrl, serviceKey, {
      cookies: { getAll: () => [], setAll: () => {} },
    })

    // 1. Determine email: real email for teachers, placeholder for students
    const placeholderEmail = (role === 'teacher' || role === 'org_admin') && email ? email : `${username}@${role}.cslearn.io`

    // 2. Create user in auth (auto-confirmed by admin API)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: authData, error: createError } = await (supabase.auth.admin as any).createUser({
      email: placeholderEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        username,
      },
    })

    if (createError) {
      if (createError.message?.includes('already registered') || createError.message?.includes('already in use')) {
        return NextResponse.json({ error: 'This username is already taken. Please choose another one.' }, { status: 409 })
      }
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    const userId = authData?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // 3. Create or find organization
    let organizationId: string | null = null

    if (orgAction === 'create') {
      const slug = (orgName || username).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newOrg } = await (supabase.from('organizations') as any)
        .insert({ name: orgName || `${fullName}'s School`, slug })
        .select('id')
        .single()

      if (newOrg) {
        organizationId = newOrg.id
      } else {
        // Slug collision - try with random suffix
        const suffix = Math.random().toString(36).substring(2, 6)
        const newSlug = `${slug}-${suffix}`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: retryOrg } = await (supabase.from('organizations') as any)
          .insert({ name: orgName || `${fullName}'s School`, slug: newSlug })
          .select('id')
          .single()
        if (retryOrg) {
          organizationId = retryOrg.id
        }
      }
    } else if (orgSlug) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: orgData } = await (supabase.from('organizations') as any)
        .select('id')
        .eq('slug', orgSlug)
        .limit(1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const foundOrg = (orgData as any[] | null)?.[0]
      if (foundOrg) {
        organizationId = foundOrg.id
      }
    }

    // 4. Upsert profile with username and organization_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upsertData: any = { id: userId, username }
    if (fullName) {
      upsertData.full_name = fullName
    }
    if (role) {
      upsertData.role = role
    }
    if (organizationId) {
      upsertData.organization_id = organizationId
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (supabase.from('profiles') as any)
      .upsert(upsertData, { onConflict: 'id' })

    if (upsertError) {
      console.error('Profile upsert error:', upsertError)
      // Don't fail - the user is created, profile might work later
    }

    return NextResponse.json({
      success: true,
      userId,
      email: placeholderEmail,
      organizationId,
    })
  } catch (err) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
