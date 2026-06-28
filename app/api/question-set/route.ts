import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { csrfProtection } from '@/lib/api-auth'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id') || searchParams.get('contentId')
  const subtopicId = searchParams.get('subtopicId')
  const status = searchParams.get('status')
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

  if (id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: setList } = await (supabase.from('question_sets') as any)
      .select('*')
      .eq('id', id)
      .limit(1)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const questionSet = (setList as any[] | null)?.[0]
    if (!questionSet) {
      return NextResponse.json({ error: 'Question set not found' }, { status: 404 })
    }

    // Fetch subtopic title
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: subtopicList } = await (supabase.from('subtopics') as any)
      .select('title')
      .eq('id', questionSet.subtopic_id)
      .limit(1)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subtopic = (subtopicList as any[] | null)?.[0]

    // Fetch release status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: releaseRows } = await (supabase.from('released_question_sets') as any)
      .select('student_id')
      .eq('question_set_id', id)

    const rRows = (releaseRows || []) as { student_id: string | null }[]
    const hasNullRow = rRows.some((r) => r.student_id === null)
    const rStudentIds = rRows
      .filter((r) => r.student_id !== null)
      .map((r) => r.student_id as string)

    return NextResponse.json({
      questionSet,
      subtopicTitle: subtopic?.title || null,
      released: rRows.length > 0,
      releaseAll: hasNullRow,
      studentIds: rStudentIds,
    })
  }

  const releaseStatus = searchParams.get('releaseStatus')
  if (releaseStatus === 'true' && id) {
    // Return release status for the modal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows } = await (supabase.from('released_question_sets') as any)
      .select('student_id')
      .eq('question_set_id', id)

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

  if (subtopicId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('question_sets') as any)
      .select('*')
      .eq('subtopic_id', subtopicId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sets } = await query

    return NextResponse.json({ questionSets: sets || [] })
  }

  return NextResponse.json({ error: 'Missing id or subtopicId parameter' }, { status: 400 })
}

export async function PATCH(request: Request) {
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
    return NextResponse.json({ error: 'Only teachers can edit question sets' }, { status: 403 })
  }

  const body = await request.json()
  const { id, questions } = body

  if (!id || !questions || !Array.isArray(questions)) {
    return NextResponse.json({ error: 'Missing id or questions array' }, { status: 400 })
  }

  // Validate questions
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    if (!q.question || typeof q.question !== 'string') {
      return NextResponse.json({ error: `Question ${i} missing valid 'question' field` }, { status: 400 })
    }
    if (!q.marks || typeof q.marks !== 'number') {
      return NextResponse.json({ error: `Question ${i} missing valid 'marks' field` }, { status: 400 })
    }
    if (!q.mark_scheme || typeof q.mark_scheme !== 'string') {
      return NextResponse.json({ error: `Question ${i} missing valid 'mark_scheme' field` }, { status: 400 })
    }
  }

  // Only allow editing draft sets
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('question_sets') as any)
    .select('status, teacher_id')
    .eq('id', id)
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (existing as any[] | null)?.[0]
  if (!set) {
    return NextResponse.json({ error: 'Question set not found' }, { status: 404 })
  }
  if (set.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Not your question set' }, { status: 403 })
  }

  // Update questions (works for both draft and published)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from('question_sets') as any)
    .update({ questions_json: questions })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update question set', details: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

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
    return NextResponse.json({ error: 'Only teachers can publish question sets' }, { status: 403 })
  }

  const body = await request.json()
  const { id, questions, studentIds, releaseAll } = body

  // Accept 'lessonId' as alias for 'id' (used by StudentReleaseModal)
  const setId = id || body.lessonId

  if (!setId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('question_sets') as any)
    .select('status, teacher_id')
    .eq('id', setId)
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (existing as any[] | null)?.[0]
  if (!set) {
    return NextResponse.json({ error: 'Question set not found' }, { status: 404 })
  }
  if (set.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Not your question set' }, { status: 403 })
  }

  const newStatus = set.status === 'published' ? 'draft' : 'published'

  // Build update payload: always toggle status, optionally save questions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: any = { status: newStatus }
  if (questions && Array.isArray(questions)) {
    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question || typeof q.question !== 'string') {
        return NextResponse.json({ error: `Question ${i} missing valid 'question' field` }, { status: 400 })
      }
      if (!q.marks || typeof q.marks !== 'number') {
        return NextResponse.json({ error: `Question ${i} missing valid 'marks' field` }, { status: 400 })
      }
      if (!q.mark_scheme || typeof q.mark_scheme !== 'string') {
        return NextResponse.json({ error: `Question ${i} missing valid 'mark_scheme' field` }, { status: 400 })
      }
    }
    updatePayload.questions_json = questions
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from('question_sets') as any)
    .update(updatePayload)
    .eq('id', setId)

  if (updateError) {
    return NextResponse.json({ error: `Failed to ${newStatus} question set`, details: updateError.message }, { status: 500 })
  }

  // Manage released_question_sets entries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s: any = supabase

  if (newStatus === 'published') {
    // Publishing: create release entries
    const isReleaseAll = releaseAll !== false && (!studentIds || studentIds.length === 0)

    // Remove existing release entries
    await (s.from('released_question_sets') as any)
      .delete()
      .eq('question_set_id', setId)
      .eq('teacher_id', user.id)

    if (isReleaseAll) {
      // Release to all students
      await (s.from('released_question_sets') as any)
        .insert({ question_set_id: setId, teacher_id: user.id, student_id: null })
    } else if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
      // Release to specific students
      const rowsToInsert = studentIds.map((sid: string) => ({
        question_set_id: setId,
        teacher_id: user.id,
        student_id: sid,
      }))
      await (s.from('released_question_sets') as any).insert(rowsToInsert)
    }
  } else {
    // Unpublishing: remove all release entries
    await (s.from('released_question_sets') as any)
      .delete()
      .eq('question_set_id', setId)
      .eq('teacher_id', user.id)
  }

  return NextResponse.json({ success: true, status: newStatus })
}

export async function DELETE(request: Request) {
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
    return NextResponse.json({ error: 'Only teachers can delete question sets' }, { status: 403 })
  }

  const body = await request.json()
  const { id } = body

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  // Only allow deleting draft sets
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase.from('question_sets') as any)
    .select('status, teacher_id')
    .eq('id', id)
    .limit(1)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (existing as any[] | null)?.[0]
  if (!set) {
    return NextResponse.json({ error: 'Question set not found' }, { status: 404 })
  }
  if (set.teacher_id !== user.id) {
    return NextResponse.json({ error: 'Not your question set' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: delError } = await (supabase.from('question_sets') as any)
    .delete()
    .eq('id', id)

  if (delError) {
    return NextResponse.json({ error: 'Failed to delete', details: delError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
