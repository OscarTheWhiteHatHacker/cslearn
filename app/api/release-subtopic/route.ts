import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { csrfProtection } from '@/lib/api-auth'

export async function POST(request: Request) {
  // CSRF check
  const csrfError = csrfProtection(request)
  if (csrfError) return csrfError

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
  const { subtopicId, action } = body

  if (!subtopicId || !action) {
    return NextResponse.json({ error: 'Missing subtopicId or action' }, { status: 400 })
  }

  if (action === 'release') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from('released_subtopics') as any)
      .insert({ subtopic_id: subtopicId, teacher_id: user.id })

    if (insertError) {
      if (insertError.message?.includes('duplicate') || insertError.code === '23505') {
        return NextResponse.json({ released: true })
      }
      return NextResponse.json({ error: `Failed to release: ${insertError.message}` }, { status: 500 })
    }

    // Also release all lessons for this subtopic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lessons } = await (supabase.from('lessons') as any)
      .select('id')
      .eq('subtopic_id', subtopicId)

    if (lessons && (lessons as { id: string }[]).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lessonsToInsert = (lessons as { id: string }[]).map((l) => ({
        lesson_id: l.id,
        teacher_id: user.id,
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('released_lessons') as any)
        .upsert(lessonsToInsert, { onConflict: 'lesson_id,teacher_id' })
    }

    return NextResponse.json({ released: true })
  }

  if (action === 'unrelease') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase.from('released_subtopics') as any)
      .delete()
      .eq('subtopic_id', subtopicId)
      .eq('teacher_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: `Failed to unrelease: ${deleteError.message}` }, { status: 500 })
    }

    return NextResponse.json({ released: false })
  }

  return NextResponse.json({ error: 'Invalid action. Use "release" or "unrelease".' }, { status: 400 })
}
