import { redirect } from 'next/navigation'
import { Crown, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getMySchool } from '@/actions/instructors'
import { SubscriptionUpgradeBrick } from '@/components/dashboard/settings/SubscriptionUpgradeBrick'

export default async function PlanUpgradePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const school = await getMySchool()
  if (!school) redirect('/auth/login')

  if ((school as { plan?: string }).plan === 'pro') {
    redirect('/dashboard/settings/plan')
  }

  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_SUBSCRIPTION_PUBLIC_KEY
  if (!publicKey) {
    return (
      <div className="dashboard-page-compact">
        <p className="text-sm text-rose-600">Chave publica de assinatura nao configurada.</p>
      </div>
    )
  }

  return (
    <div className="dashboard-page-compact">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Assinar VSPro
        </h1>
        <p className="mt-1 text-sm text-slate-400">Ative sua assinatura mensal e tenha acesso completo.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Checkout */}
        <div>
          <div className="mb-4 flex items-center gap-2 rounded border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-4 py-3">
            <Crown size={15} className="shrink-0 text-[var(--primary)]" />
            <span className="text-sm font-semibold text-[var(--primary)]">VSPro · R$ 99,90/mes · Cobrado mensalmente</span>
          </div>

          <SubscriptionUpgradeBrick
            payerEmail={user.email ?? ''}
            publicKey={publicKey}
          />
        </div>

        {/* Summary */}
        <aside className="space-y-4">
          <div className="rounded border border-slate-200 bg-white p-5">
            <h3 className="mb-4 font-condensed text-sm font-bold uppercase tracking-wide text-slate-500">
              Resumo do plano
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-600">VSPro mensal</span>
                <span className="font-semibold text-slate-800">R$ 99,90</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-800">Total mensal</span>
                <span className="font-bold text-slate-900">R$ 99,90</span>
              </div>
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <ShieldCheck size={13} />
              Seguranca
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Pagamento processado com seguranca pelo Mercado Pago. Voce pode cancelar a qualquer momento.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
