import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'

const resetSchema = z.object({
  studentId: z.string().uuid('Invalid student ID'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
})

export async function POST(request: Request) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabase = createServerClient(supabaseUrl, serviceKey, {
      cookies: { getAll: () => [], setAll: () => {} },
    })

    // Verify the requester is authenticated as a teacher
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const authHeader = request.headers.get('Authorization')?.replace('Bearer ', '')
    // Use auth header from request if provided (client sends its session token)
    let teacherUser = user
    if (!teacherUser && authHeader) {
      const { data: { user: headerUser } } = await supabase.auth.getUser(authHeader)
      teacherUser = headerUser
    }

    if (authError || !teacherUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get teacher's profile to check role and organization
    const { data: teacherProfile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', teacherUser.id)
      .single()

    if (!teacherProfile || teacherProfile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can reset passwords' }, { status: 403 })
    }

    if (!teacherProfile.organization_id) {
      return NextResponse.json({ error: 'You must belong to a school to manage students' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = resetSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'Invalid input' },
        { status: 400 },
      )
    }

    const { studentId, newPassword } = validation.data

    // Verify the student belongs to the same organization
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('id, organization_id, full_name, username')
      .eq('id', studentId)
      .single()

    if (!studentProfile) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (studentProfile.organization_id !== teacherProfile.organization_id) {
      return NextResponse.json({ error: 'Student does not belong to your school' }, { status: 403 })
    }

    // Reset the password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      studentId,
      { password: newPassword },
    )

    if (updateError) {
      console.error('Password reset error:', updateError)
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Password reset for ${studentProfile.full_name || studentProfile.username}`,
    })
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
