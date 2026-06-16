import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import Stripe from 'stripe'

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    console.error('[Stripe Webhook] signature verification failed:', message)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const subjectId = session.metadata?.subject_id
    const orgId = session.metadata?.org_id
    const purchaserId = session.metadata?.purchaser_id
    const paymentIntentId = session.payment_intent as string | undefined

    if (!subjectId || !orgId) {
      console.error('[Stripe Webhook] Missing metadata in session', session.id)
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    // Use service role key — Stripe webhook has no user session, RLS would block
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })
    }
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    // Insert purchase record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from('org_purchases') as any)
      .insert({
        org_id: orgId,
        subject_id: subjectId,
        stripe_payment_intent_id: paymentIntentId || null,
      })

    if (insertError) {
      if (insertError.code === '23505') {
        console.log('[Stripe Webhook] Duplicate purchase ignored for', subjectId, orgId)
        return NextResponse.json({ received: true })
      }
      console.error('[Stripe Webhook] Insert error:', insertError)
      return NextResponse.json({ error: `Failed to record purchase: ${insertError.message}` }, { status: 500 })
    }

    console.log('[Stripe Webhook] Purchase recorded:', subjectId, orgId)

    // Auto-grant access to the purchaser (org_admin) 
    if (purchaserId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: grantError } = await (supabase.from('subject_teacher_access') as any)
        .upsert(
          { teacher_id: purchaserId, subject_id: subjectId, granted_by: purchaserId },
          { onConflict: 'teacher_id, subject_id' }
        )
      if (grantError) {
        console.error('[Stripe Webhook] Auto-grant error:', grantError)
      } else {
        console.log('[Stripe Webhook] Auto-granted access to purchaser:', purchaserId)
      }
    }
  }

  return NextResponse.json({ received: true })
}
