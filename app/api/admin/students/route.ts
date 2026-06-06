import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { requireTeacher, csrfProtection } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    // CSRF check
    const csrfError = csrfProtection(request)
    if (csrfError) return csrfError

    // Session auth
    const { errorResponse } = await requireTeacher()
    if (errorResponse) return errorResponse

    const body = await request.json()
    const { action, orgId, studentId, password, fullName } = body
    const username = (body.username || '').toLowerCase().trim()

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    if (action === 'create') {
      if (!username || !password || !fullName || !orgId) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      // Check username uniqueness
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase.from('profiles') as any)
        .select('id')
        .eq('username', username.trim())
        .limit(1)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((existing as any[] | null)?.[0]) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
      }

      const placeholderEmail = `${username.trim()}@student.cslearn.io`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: authData, error: createError } = await (supabase.auth.admin as any).createUser({
        email: placeholderEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName.trim(), role: 'student', username: username.trim() },
      })

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      const userId = authData?.user?.id
      if (!userId) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      // Upsert profile with username and org
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('profiles') as any)
        .upsert({ id: userId, username: username.trim(), organization_id: orgId, role: 'student', full_name: fullName.trim() }, { onConflict: 'id' })

      return NextResponse.json({ success: true, userId, email: placeholderEmail })
    }

    if (action === 'update') {
      if (!studentId || !fullName) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase.from('profiles') as any)
        .update({ full_name: fullName.trim() })
        .eq('id', studentId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'delete') {
      if (!studentId) {
        return NextResponse.json({ error: 'Missing studentId' }, { status: 400 })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: delError } = await (supabase.auth.admin as any).deleteUser(studentId)
      if (delError) {
        return NextResponse.json({ error: delError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
