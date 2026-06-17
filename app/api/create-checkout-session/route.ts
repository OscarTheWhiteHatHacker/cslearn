import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { csrfProtection } from '@/lib/api-auth'
import Stripe from 'stripe'

// Stripe Price IDs for each purchasable subject
const SUBJECT_PRICE_IDS: Record<string, string> = {
  'aqa-english-language': 'price_1TjOl84oCNWl2tLiEfMXBvlb',
  'edexcel-english-language': 'price_1TjOlA4oCNWl2tLizvnksPJE',
}

export async function POST(request: Request) {
  // Lazy-init Stripe so the build doesn't fail on missing env var
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
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

  // Get subject details (include slug for Stripe price lookup)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: subjectList } = await (supabase.from('subjects') as any)
    .select('name, slug, price_pence')
    .eq('id', subjectId)
    .limit(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subject = (subjectList as any[] | null)?.[0]
  if (!subject) {
    return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
  }

  // Look up Stripe Price ID for this subject
  const priceId = SUBJECT_PRICE_IDS[subject.slug]
  if (!priceId) {
    return NextResponse.json({ error: 'No Stripe price configured for this subject' }, { status: 500 })
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
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        subject_id: subjectId,
        org_id: profile.organization_id,
        purchaser_id: user.id,
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
