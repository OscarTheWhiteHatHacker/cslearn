import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { csrfProtection } from '@/lib/api-auth'

/**
 * POST /api/release-lesson
 *
 * Release/unrelease a lesson with optional per-student targeting.
 *
 * Body:
 *   { lessonId, action: 'release' | 'unrelease', releaseAll?: boolean, studentIds?: string[] }
 *
 * - action='release' with releaseAll=true (or no studentIds): create/ensure a single
 *   row with student_id=NULL — visible to ALL students.
 * - action='release' with releaseAll=false + studentIds array: create rows for each
 *   student. Previous assignments for OTHER students are removed.
 * - action='unrelease': delete ALL release rows for this lesson+teacher.
 *
 * GET /api/release-lesson?contentId=<lessonId>
 *
 * Returns the current release status for the modal:
 *   { released: boolean, releaseAll: boolean, studentIds: string[] }
 */
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
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'org_admin')) {
    return NextResponse.json({ error: 'Only teachers can manage lessons' }, { status: 403 })
  }

  const body = await request.json()
  const { lessonId, action, releaseAll, studentIds } = body

  if (!lessonId || !action) {
    return NextResponse.json({ error: 'Missing lessonId or action' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = supabase

  if (action === 'release') {
    // If releaseAll or no studentIds specified, release to all
    if (releaseAll !== false && (!studentIds || studentIds.length === 0)) {
      // Remove any existing per-student rows
      await (s.from('released_lessons') as any)
        .delete()
        .eq('lesson_id', lessonId)
        .eq('teacher_id', user.id)

      // Insert the all-students row (student_id = null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (s.from('released_lessons') as any)
        .insert({ lesson_id: lessonId, teacher_id: user.id, student_id: null })

      if (insertError) {
        if (insertError.message?.includes('duplicate') || insertError.code === '23505') {
          return NextResponse.json({ released: true, releaseAll: true })
        }
        return NextResponse.json({ error: `Failed to release: ${insertError.message}` }, { status: 500 })
      }

      return NextResponse.json({ released: true, releaseAll: true })
    }

    // Release to specific students
    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      // Remove all existing rows for this lesson+teacher
      await (s.from('released_lessons') as any)
        .delete()
        .eq('lesson_id', lessonId)
        .eq('teacher_id', user.id)

      // Insert per-student rows
      const rowsToInsert = studentIds.map((sid: string) => ({
        lesson_id: lessonId,
        teacher_id: user.id,
        student_id: sid,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (s.from('released_lessons') as any)
        .insert(rowsToInsert)

      if (insertError) {
        return NextResponse.json({ error: `Failed to release: ${insertError.message}` }, { status: 500 })
      }

      return NextResponse.json({ released: true, releaseAll: false, studentIds })
    }

    return NextResponse.json({ error: 'Provide releaseAll=true or a non-empty studentIds array' }, { status: 400 })
  }

  if (action === 'unrelease') {
    // Delete ALL release rows for this lesson+teacher
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (s.from('released_lessons') as any)
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = supabase

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const contentId = searchParams.get('contentId')

  if (!contentId) {
    return NextResponse.json({ error: 'Missing contentId' }, { status: 400 })
  }

  // Get all release rows for this lesson + teacher
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (s.from('released_lessons') as any)
    .select('student_id')
    .eq('lesson_id', contentId)
    .eq('teacher_id', user.id)

  const releaseRows = (rows || []) as { student_id: string | null }[]
  const hasNullRow = releaseRows.some((r) => r.student_id === null)
  const studentIds = releaseRows
    .filter((r) => r.student_id !== null)
    .map((r) => r.student_id as string)

  return NextResponse.json({
    released: releaseRows.length > 0,
    releaseAll: hasNullRow,
    studentIds,
  })
}
