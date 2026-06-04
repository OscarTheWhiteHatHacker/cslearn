import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, organizationId, secret } = body
    const username = (body.username || '').toLowerCase().trim()

    if (secret !== process.env.WIPE_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!userId || !username) {
      return NextResponse.json({ error: 'Missing userId or username' }, { status: 400 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    // 1. Confirm the user's email (so they can sign in immediately)
    const { error: confirmError } = await supabase.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    )

    if (confirmError) {
      return NextResponse.json({ error: `Failed to confirm user: ${confirmError.message}` }, { status: 500 })
    }

    // 2. Upsert profile with username and organization_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upsertData: any = { id: userId, username }
    if (organizationId) {
      upsertData.organization_id = organizationId
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (supabase.from('profiles') as any)
      .upsert(upsertData, { onConflict: 'id' })

    if (upsertError) {
      return NextResponse.json({ error: `Profile upsert failed: ${upsertError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
