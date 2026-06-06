import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    const { studentId, feedback } = body

    if (!studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 })
    }

    const supabase = await createClient()

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
