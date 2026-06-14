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

  // Check org_admin role
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileList } = await (supabase.from('profiles') as any)
    .select('role, organization_id')
    .eq('id', user.id)
    .limit(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (profileList as any[] | null)?.[0]
  if (!profile || profile.role !== 'org_admin') {
    return NextResponse.json({ error: 'Forbidden: org admins only' }, { status: 403 })
  }
  if (!profile.organization_id) {
    return NextResponse.json({ error: 'You must belong to an organisation' }, { status: 400 })
  }

  const body = await request.json()
  const { teacherId, subjectId, grant } = body

  if (!teacherId || !subjectId || grant === undefined) {
    return NextResponse.json({ error: 'Missing teacherId, subjectId, or grant' }, { status: 400 })
  }

  // Verify the teacher is in the same org
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacherList } = await (supabase.from('profiles') as any)
    .select('id, organization_id')
    .eq('id', teacherId)
    .eq('organization_id', profile.organization_id)
    .limit(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teacher = (teacherList as any[] | null)?.[0]
  if (!teacher) {
    return NextResponse.json({ error: 'Teacher not found in your organisation' }, { status: 404 })
  }

  // Verify the org has purchased this subject
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: purchaseList } = await (supabase.from('org_purchases') as any)
    .select('id')
    .eq('org_id', profile.organization_id)
    .eq('subject_id', subjectId)
    .limit(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(purchaseList as any[] | null)?.length) {
    return NextResponse.json({ error: 'Subject not purchased by your organisation' }, { status: 400 })
  }

  if (grant) {
    // Grant access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from('subject_teacher_access') as any)
      .insert({
        teacher_id: teacherId,
        subject_id: subjectId,
        granted_by: user.id,
      })

    if (insertError) {
      // If already exists, that's fine
      if (insertError.code === '23505') {
        return NextResponse.json({ success: true })
      }
      console.error('[Set Teacher Access] Insert error:', insertError)
      return NextResponse.json({ error: `Failed to grant access: ${insertError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } else {
    // Revoke access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase.from('subject_teacher_access') as any)
      .delete()
      .eq('teacher_id', teacherId)
      .eq('subject_id', subjectId)

    if (deleteError) {
      console.error('[Set Teacher Access] Delete error:', deleteError)
      return NextResponse.json({ error: `Failed to revoke access: ${deleteError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }
}
