import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { csrfProtection } from '@/lib/api-auth'
import Stripe from 'stripe'

export async function POST(request: Request) {
  // Lazy-init Stripe so the build doesn't fail on missing env var
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-03-31' as any,
  })
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
    return NextResponse.json({ error: 'You must belong to an organisation to purchase subjects' }, { status: 400 })
  }

  const body = await request.json()
  const { subjectId } = body

  if (!subjectId) {
    return NextResponse.json({ error: 'Missing subjectId' }, { status: 400 })
  }

  // Get subject details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subjectList } = await (supabase.from('subjects') as any)
    .select('name, price_pence')
    .eq('id', subjectId)
    .limit(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subject = (subjectList as any[] | null)?.[0]
  if (!subject) {
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
  const purchaseList = existingPurchase as any[] | null
  if (purchaseList && purchaseList.length > 0) {
    return NextResponse.json({ error: 'Subject already purchased' }, { status: 400 })
  }

  // Create Stripe Checkout Session
  const origin = new URL(request.url).origin

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: subject.name,
            },
            unit_amount: subject.price_pence,
          },
          quantity: 1,
        },
      ],
      metadata: {
        subject_id: subjectId,
        org_id: profile.organization_id,
      },
      success_url: `${origin}/teacher/subjects?success=1`,
      cancel_url: `${origin}/teacher/subjects?cancelled=1`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[Stripe Checkout] error:', err)
    const message = err instanceof Error ? err.message : 'Failed to create checkout session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
