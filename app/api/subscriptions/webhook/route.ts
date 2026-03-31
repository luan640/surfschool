import { NextResponse } from 'next/server'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { createAdminClient } from '@/lib/supabase/admin'

interface SubscriptionWebhookBody {
  type?: string
  action?: string
  data?: { id?: string }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubscriptionWebhookBody

    if (body.type !== 'subscription_preapproval' || !body.data?.id) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 202 })
    }

    const accessToken = process.env.MERCADOPAGO_SUBSCRIPTION_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token nao configurado.' }, { status: 500 })
    }

    const mp = new MercadoPagoConfig({ accessToken })
    const preApprovalClient = new PreApproval(mp)
    const preapproval = await preApprovalClient.get({ id: body.data.id })

    const admin = createAdminClient()

    // Find school by subscription ID
    const { data: subscription } = await admin
      .from('school_subscriptions')
      .select('id, school_id')
      .eq('mp_subscription_id', String(preapproval.id))
      .maybeSingle()

    if (!subscription) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 202 })
    }

    // Update subscription record
    await admin
      .from('school_subscriptions')
      .update({
        status: preapproval.status ?? 'pending',
        next_payment_date: (preapproval as { next_payment_date?: string }).next_payment_date ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)

    // Sync school plan based on subscription status
    if (preapproval.status === 'authorized') {
      await admin
        .from('schools')
        .update({ plan: 'pro', access_limit: null })
        .eq('id', subscription.school_id)
    } else if (preapproval.status === 'cancelled' || preapproval.status === 'paused') {
      // Set 30 days grace period on cancellation/pause
      const grace = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      await admin
        .from('schools')
        .update({ plan: 'free', access_limit: grace })
        .eq('id', subscription.school_id)
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao processar webhook de assinatura.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
