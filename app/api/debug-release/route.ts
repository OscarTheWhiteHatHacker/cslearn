import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = supabase

  const r = { released_lessons: [] as any[], org_id: null as string | null }

  if (user) {
    const { data: rl } = await (s.from('released_lessons') as any).select('lesson_id,student_id,teacher_id')
    r.released_lessons = rl || []
    r.org_id = user.id
  }

  return NextResponse.json(r)
}
