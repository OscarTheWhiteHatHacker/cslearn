import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = supabase

  const r: Record<string, unknown> = {}

  if (user) {
    // 1. Check the user's profile
    const { data: prof } = await (s.from('profiles') as any)
      .select('id, organization_id, role')
      .eq('id', user.id)
      .limit(1)
    r.profile = prof || null

    // 2. Try current_user_org_id()
    const { data: orgIdResult } = await (s.rpc as any)('current_user_org_id')
    r.current_user_org_id = orgIdResult

    // 3. Query released_lessons directly
    const { data: rl, error: rlErr } = await (s.from('released_lessons') as any)
      .select('lesson_id,student_id,teacher_id')
    r.released_lessons = rl || []
    r.released_lessons_error = rlErr?.message || null

    // 4. Check is_teacher()
    const { data: isTeach } = await (s.rpc as any)('is_teacher')
    r.is_teacher = isTeach

    r.user_id = user.id
  }

  return NextResponse.json(r)
}
