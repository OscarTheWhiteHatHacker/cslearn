import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check teacher role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileList } = await (supabase.from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .limit(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (profileList as any[] | null)?.[0]
  if (!profile || profile.role !== 'teacher') {
    return NextResponse.json({ error: 'Only teachers can manage releases' }, { status: 403 })
  }

  const body = await request.json()
  const { lessonId, action } = body

  if (!lessonId || !action) {
    return NextResponse.json({ error: 'Missing lessonId or action' }, { status: 400 })
  }

  if (action === 'release') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from('released_lessons') as any)
      .insert({ lesson_id: lessonId, teacher_id: user.id })

    if (insertError) {
      if (insertError.message?.includes('duplicate') || insertError.code === '23505') {
        return NextResponse.json({ released: true })
      }
      return NextResponse.json({ error: `Failed to release: ${insertError.message}` }, { status: 500 })
    }

    return NextResponse.json({ released: true })
  }

  if (action === 'unrelease') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase.from('released_lessons') as any)
      .delete()
      .eq('lesson_id', lessonId)
      .eq('teacher_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: `Failed to unrelease: ${deleteError.message}` }, { status: 500 })
    }

    return NextResponse.json({ released: false })
  }

  return NextResponse.json({ error: 'Invalid action. Use "release" or "unrelease".' }, { status: 400 })
}

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const subtopicId = searchParams.get('subtopicId')

  if (!subtopicId) {
    return NextResponse.json({ error: 'Missing subtopicId' }, { status: 400 })
  }

  // Get all released lessons for this teacher and subtopic
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: released } = await (supabase.from('released_lessons') as any)
    .select('lesson_id')
    .eq('teacher_id', user.id)

  const releasedIds = new Set((released || []).map((r: { lesson_id: string }) => r.lesson_id))

  // Get all lessons for this subtopic with their release status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lessons } = await (supabase.from('lessons') as any)
    .select('*')
    .eq('subtopic_id', subtopicId)
    .order('order_number')

  const result = (lessons || []).map((l: { id: string; title: string; order_number: number; content_json: Record<string, unknown> }) => ({
    id: l.id,
    title: l.title,
    order_number: l.order_number,
    released: releasedIds.has(l.id),
  }))

  return NextResponse.json({ lessons: result })
}
