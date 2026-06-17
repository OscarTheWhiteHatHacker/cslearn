import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { csrfProtection } from '@/lib/api-auth'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(request: Request) {
  // CSRF check
  const csrfError = csrfProtection(request)
  if (csrfError) return csrfError

  // Use anon client for auth (reads session cookies)
  const anonSupabase = await createClient()
  const { data: { user } } = await anonSupabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role key for db writes (bypasses RLS for org_purchases/subject_teacher_access)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })
  }
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // Check teacher or org_admin role (using service role client for the profile read too)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileList } = await (supabase.from('profiles') as any)
    .select('role, organization_id')
    .eq('id', user.id)
    .limit(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (profileList as any[] | null)?.[0]
  if (!profile || (profile.role !== 'teacher' && profile.role !== 'org_admin')) {
    return NextResponse.json({ error: 'Forbidden: teachers only' }, { status: 403 })
  }
  if (!profile.organization_id) {
    return NextResponse.json({ error: 'You must belong to an organisation to use promo codes' }, { status: 400 })
  }

  const body = await request.json()
  const { subjectId, promoCode } = body

  if (!subjectId || !promoCode) {
    return NextResponse.json({ error: 'Missing subjectId or promoCode' }, { status: 400 })
  }

  // Validate promo code against Stripe
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  let codeValid = false
  try {
    const codes = await stripe.promotionCodes.list({
      code: promoCode.trim().toLowerCase(),
      active: true,
      limit: 1,
    })
    codeValid = codes.data.length > 0
  } catch (err) {
    console.error('[Apply Promo] Stripe lookup error:', err)
    return NextResponse.json({ error: 'Failed to validate promo code' }, { status: 500 })
  }

  if (!codeValid) {
    return NextResponse.json({ error: 'Invalid or expired promo code' }, { status: 400 })
  }

  // Check if subject exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subjectList } = await (supabase.from('subjects') as any)
    .select('id')
    .eq('id', subjectId)
    .limit(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subjectData = subjectList as any[] | null
  if (!subjectData || !subjectData.length) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
  }

  // Check if already purchased
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingPurchase } = await (supabase.from('org_purchases') as any)
    .select('id')
    .eq('org_id', profile.organization_id)
    .eq('subject_id', subjectId)
    .limit(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const purchaseData = existingPurchase as any[] | null
  if (purchaseData && purchaseData.length > 0) {
    return NextResponse.json({ success: true, message: 'Subject already unlocked!' })
  }

  // Insert purchase record (no stripe payment intent id for promo)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (supabase.from('org_purchases') as any)
    .insert({
      org_id: profile.organization_id,
      subject_id: subjectId,
      stripe_payment_intent_id: null,
    })

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ success: true, message: 'Subject already unlocked!' })
    }
    console.error('[Apply Promo] Insert error:', insertError)
    return NextResponse.json({ error: `Failed to apply promo: ${insertError.message}` }, { status: 500 })
  }

  // Auto-grant access to the person who applied the promo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: grantError } = await (supabase.from('subject_teacher_access') as any)
    .upsert(
      { teacher_id: user.id, subject_id: subjectId, granted_by: user.id },
      { onConflict: 'teacher_id,subject_id' }
    )
  if (grantError) {
    console.error('[Apply Promo] Auto-grant error:', grantError)
  }

  return NextResponse.json({ success: true, message: 'Subject unlocked!' })
}
