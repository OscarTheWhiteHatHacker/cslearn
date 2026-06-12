import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { requireTeacher, csrfProtection } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    // CSRF check
    const csrfError = csrfProtection(request)
    if (csrfError) return csrfError

    // Session auth
    const { user, errorResponse } = await requireTeacher()
    if (errorResponse) return errorResponse

    const body = await request.json()
    const { studentId, feedback } = body

    if (!studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    // Verify the target student belongs to the same org as the teacher
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacherProfile } = await (supabase.from('profiles') as any)
      .select('organization_id')
      .eq('id', user!.id)
      .limit(1)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teacherOrg = (teacherProfile as any[] | null)?.[0]?.organization_id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: studentProfile } = await (supabase.from('profiles') as any)
      .select('organization_id')
      .eq('id', studentId)
      .limit(1)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentOrg = (studentProfile as any[] | null)?.[0]?.organization_id

    if (!teacherOrg || !studentOrg || teacherOrg !== studentOrg) {
      return NextResponse.json({ error: 'Student does not belong to your organization' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('profiles') as any)
      .update({
        teacher_feedback: feedback || '',
        feedback_updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
