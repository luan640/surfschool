import { NextResponse } from 'next/server'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMySchool } from '@/actions/instructors'

interface CreateSubscriptionBody {
  token: string
  paymentMethodId: string
  issuerId?: string
  payerEmail: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })
    }

    const school = await getMySchool()
    if (!school) {
      return NextResponse.json({ error: 'Escola nao encontrada.' }, { status: 404 })
    }

    const accessToken = process.env.MERCADOPAGO_SUBSCRIPTION_ACCESS_TOKEN
    const planId = process.env.MERCADOPAGO_SUBSCRIPTION_PLAN_ID
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')

    if (!accessToken || !planId) {
      return NextResponse.json({ error: 'Configuracao de assinatura incompleta.' }, { status: 500 })
    }

    const body = (await request.json()) as CreateSubscriptionBody
    const { token, paymentMethodId, payerEmail } = body

    if (!token || !paymentMethodId || !payerEmail) {
      return NextResponse.json({ error: 'Dados do cartao incompletos.' }, { status: 400 })
    }

    const mp = new MercadoPagoConfig({ accessToken })
    const preApprovalClient = new PreApproval(mp)

    const preapproval = await preApprovalClient.create({
      body: {
        preapproval_plan_id: planId,
        payer_email: payerEmail,
        card_token_id: token,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: 1.00,
          currency_id: 'BRL',
        },
        back_url: `${appUrl}/dashboard/settings/plan?subscription=success`,
        notification_url: `${appUrl}/api/subscriptions/webhook`,
        status: 'authorized',
      },
    })

    const admin = createAdminClient()

    // Save subscription record
    await admin.from('school_subscriptions').upsert(
      {
        school_id: school.id,
        mp_subscription_id: String(preapproval.id),
        mp_preapproval_plan_id: planId,
        status: preapproval.status ?? 'pending',
        payer_email: payerEmail,
        next_payment_date: (preapproval as { next_payment_date?: string }).next_payment_date ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'mp_subscription_id' },
    )

    // If authorized, upgrade school plan
    if (preapproval.status === 'authorized') {
      await admin
        .from('schools')
        .update({ plan: 'pro', access_limit: null })
        .eq('id', school.id)
    }

    return NextResponse.json({
      subscriptionId: preapproval.id,
      status: preapproval.status,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao criar assinatura.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
