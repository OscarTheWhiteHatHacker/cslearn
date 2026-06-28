import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { csrfProtection } from '@/lib/api-auth'

/**
 * POST /api/release-subtopic
 *
 * Release/unrelease a subtopic with optional per-student targeting.
 *
 * Body:
 *   { subtopicId, action: 'release' | 'unrelease', releaseAll?: boolean, studentIds?: string[] }
 *
 * - action='release' with releaseAll=true (or no studentIds): create/ensure a single
 *   row with student_id=NULL — visible to ALL students.
 * - action='release' with releaseAll=false + studentIds array: create rows for each
 *   student. Any previous per-student assignments for OTHER students are removed.
 * - action='unrelease': delete ALL release rows for this subtopic+teacher.
 *
 * GET /api/release-subtopic?contentId=<subtopicId>
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

  // Check teacher/org_admin role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileList } = await (supabase.from('profiles') as any)
    .select('role')
    .eq('id', user.id)
    .limit(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (profileList as any[] | null)?.[0]
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'org_admin')) {
    return NextResponse.json({ error: 'Only teachers can manage releases' }, { status: 403 })
  }

  const body = await request.json()
  const { subtopicId, action, releaseAll, studentIds } = body

  if (!subtopicId || !action) {
    return NextResponse.json({ error: 'Missing subtopicId or action' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = supabase

  if (action === 'release') {
    // If releaseAll or no studentIds specified, release to all
    if (releaseAll !== false && (!studentIds || studentIds.length === 0)) {
      // Remove any existing per-student rows, replace with one all-student row
      await (s.from('released_subtopics') as any)
        .delete()
        .eq('subtopic_id', subtopicId)
        .eq('teacher_id', user.id)

      // Insert the all-students row (student_id = null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (s.from('released_subtopics') as any)
        .insert({ subtopic_id: subtopicId, teacher_id: user.id, student_id: null })

      if (insertError) {
        if (insertError.message?.includes('duplicate') || insertError.code === '23505') {
          return NextResponse.json({ released: true, releaseAll: true })
        }
        return NextResponse.json({ error: `Failed to release: ${insertError.message}` }, { status: 500 })
      }

      // Also release all lessons for this subtopic to all students
      await releaseAllLessonsForSubtopic(s, subtopicId, user.id)

      return NextResponse.json({ released: true, releaseAll: true })
    }

    // Release to specific students
    if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      // Remove all existing rows for this subtopic+teacher (both all-student and per-student)
      await (s.from('released_subtopics') as any)
        .delete()
        .eq('subtopic_id', subtopicId)
        .eq('teacher_id', user.id)

      // Insert per-student rows
      const rowsToInsert = studentIds.map((sid: string) => ({
        subtopic_id: subtopicId,
        teacher_id: user.id,
        student_id: sid,
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (s.from('released_subtopics') as any)
        .insert(rowsToInsert)

      if (insertError) {
        return NextResponse.json({ error: `Failed to release: ${insertError.message}` }, { status: 500 })
      }

      // Also release lessons for these specific students
      await releaseLessonsForSubtopic(s, subtopicId, user.id, studentIds)

      return NextResponse.json({ released: true, releaseAll: false, studentIds })
    }

    return NextResponse.json({ error: 'Provide releaseAll=true or a non-empty studentIds array' }, { status: 400 })
  }

  if (action === 'unrelease') {
    // Delete ALL release rows for this subtopic+teacher
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (s.from('released_subtopics') as any)
      .delete()
      .eq('subtopic_id', subtopicId)
      .eq('teacher_id', user.id)

    // Also remove lesson releases for this subtopic
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lessons } = await (s.from('lessons') as any)
      .select('id')
      .eq('subtopic_id', subtopicId)

    if (lessons && (lessons as { id: string }[]).length > 0) {
      const lessonIds = (lessons as { id: string }[]).map((l) => l.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (s.from('released_lessons') as any)
        .delete()
        .in('lesson_id', lessonIds)
        .eq('teacher_id', user.id)
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

  // Get all release rows for this subtopic + teacher
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (s.from('released_subtopics') as any)
    .select('student_id')
    .eq('subtopic_id', contentId)
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

/**
 * Helper: release all lessons under a subtopic to ALL students.
 * Used when a subtopic is released to all.
 */
async function releaseAllLessonsForSubtopic(s: any, subtopicId: string, teacherId: string) {
  const { data: lessons } = await (s.from('lessons') as any)
    .select('id')
    .eq('subtopic_id', subtopicId)

  if (lessons && (lessons as { id: string }[]).length > 0) {
    // Delete any existing per-student lesson releases
    await (s.from('released_lessons') as any)
      .delete()
      .in(
        'lesson_id',
        (lessons as { id: string }[]).map((l) => l.id)
      )
      .eq('teacher_id', teacherId)

    // Insert all-students lesson releases
    const lessonsToInsert = (lessons as { id: string }[]).map((l) => ({
      lesson_id: l.id,
      teacher_id: teacherId,
      student_id: null,
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (s.from('released_lessons') as any)
      .upsert(lessonsToInsert, { onConflict: 'lesson_id,teacher_id,student_id' })
  }
}

/**
 * Helper: release all lessons under a subtopic to specific students.
 */
async function releaseLessonsForSubtopic(s: any, subtopicId: string, teacherId: string, studentIds: string[]) {
  const { data: lessons } = await (s.from('lessons') as any)
    .select('id')
    .eq('subtopic_id', subtopicId)

  if (lessons && (lessons as { id: string }[]).length > 0) {
    const lessonIds = (lessons as { id: string }[]).map((l) => l.id)

    // Remove all existing rows for these lessons
    await (s.from('released_lessons') as any)
      .delete()
      .in('lesson_id', lessonIds)
      .eq('teacher_id', teacherId)

    // Insert per-student rows for each lesson
    const rowsToInsert: { lesson_id: string; teacher_id: string; student_id: string }[] = []
    for (const lessonId of lessonIds) {
      for (const studentId of studentIds) {
        rowsToInsert.push({ lesson_id: lessonId, teacher_id: teacherId, student_id: studentId })
      }
    }

    if (rowsToInsert.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (s.from('released_lessons') as any)
        .insert(rowsToInsert)
    }
  }
}
