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

  // Check teacher or org_admin role
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

  // Validate promo code
  if (promoCode !== 'freemoney') {
    return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 })
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
    // Handle duplicate gracefully
    if (insertError.code === '23505') {
      return NextResponse.json({ success: true, message: 'Subject already unlocked!' })
    }
    console.error('[Apply Promo] Insert error:', insertError)
    return NextResponse.json({ error: `Failed to apply promo: ${insertError.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Subject unlocked!' })
}
