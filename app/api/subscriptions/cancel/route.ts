import { NextResponse } from 'next/server'
import { MercadoPagoConfig, PreApproval } from 'mercadopago'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMySchool } from '@/actions/instructors'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

    const school = await getMySchool()
    if (!school) return NextResponse.json({ error: 'Escola nao encontrada.' }, { status: 404 })

    const admin = createAdminClient()

    const { data: subscription } = await admin
      .from('school_subscriptions')
      .select('id, mp_subscription_id, status')
      .eq('school_id', school.id)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!subscription) {
      return NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada.' }, { status: 404 })
    }

    const accessToken = process.env.MERCADOPAGO_SUBSCRIPTION_ACCESS_TOKEN
    if (!accessToken) return NextResponse.json({ error: 'Configuracao ausente.' }, { status: 500 })

    const mp = new MercadoPagoConfig({ accessToken })
    const preApprovalClient = new PreApproval(mp)

    try {
      await preApprovalClient.update({
        id: subscription.mp_subscription_id,
        body: { status: 'cancelled' },
      })
    } catch {
      // Assinatura já cancelada no MP ou indisponível — prossegue com cancelamento local
    }

    const grace = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    await admin
      .from('school_subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', subscription.id)

    await admin
      .from('schools')
      .update({ plan: 'free', access_limit: grace })
      .eq('id', school.id)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[cancel-subscription] Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Erro ao cancelar assinatura.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
