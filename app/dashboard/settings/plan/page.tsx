import { redirect } from 'next/navigation'
import { CalendarClock, CheckCircle2, Crown, Rocket, ShieldAlert } from 'lucide-react'
import { getMySchool } from '@/actions/instructors'
import { getActiveSubscription } from '@/actions/dashboard'
import { Button } from '@/components/ui/button'
import { CancelSubscriptionButton } from '@/components/dashboard/settings/CancelSubscriptionButton'

interface Props {
  searchParams?: Promise<{ subscription?: string }>
}

export default async function PlanPage({ searchParams }: Props) {
  const school = await getMySchool()
  if (!school) redirect('/auth/login')

  const subscription = await getActiveSubscription()
  const params = searchParams ? await searchParams : undefined

  const isPro = (school as { plan?: string }).plan === 'pro'
  const accessLimit: Date | null = (school as { access_limit?: string | null }).access_limit
    ? new Date((school as { access_limit: string }).access_limit)
    : null
  const now = new Date()
  const isExpired = accessLimit ? accessLimit < now : false
  const daysLeft = accessLimit
    ? Math.max(0, Math.ceil((accessLimit.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <div className="dashboard-page-compact">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Plano
        </h1>
        <p className="mt-1 text-sm text-slate-400">Gerencie sua assinatura e limites de acesso.</p>
      </div>

      {params?.subscription === 'success' && (
        <div className="mb-6 flex items-center gap-3 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          Assinatura ativada com sucesso! Seu plano VSPro ja esta ativo.
        </div>
      )}

      <div className="space-y-4">
        {/* Current plan card */}
        <section className={`rounded border p-6 ${isPro ? 'border-[var(--primary)]/30 bg-[var(--primary)]/5' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {isPro ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-white">
                  <Crown size={18} />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <Crown size={18} />
                </div>
              )}
              <div>
                <h2 className="font-condensed text-lg font-bold uppercase tracking-wide text-slate-800">
                  {isPro ? 'VSPro' : 'Plano Gratuito'}
                </h2>
                <p className="text-sm text-slate-500">
                  {isPro ? 'R$ 99,90/mes · Acesso completo' : 'Periodo de teste gratuito'}
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${isPro ? 'bg-[var(--primary)] text-white' : 'bg-slate-100 text-slate-600'}`}>
              {isPro ? 'Ativo' : 'Free'}
            </span>
          </div>

          {/* Access limit */}
          {accessLimit && (
            <div className={`mt-5 flex items-center gap-3 rounded border px-4 py-3 ${isExpired ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'}`}>
              {isExpired ? (
                <ShieldAlert size={16} className="shrink-0 text-rose-500" />
              ) : (
                <CalendarClock size={16} className="shrink-0 text-amber-600" />
              )}
              <div>
                <p className={`text-sm font-semibold ${isExpired ? 'text-rose-800' : 'text-amber-800'}`}>
                  {isExpired
                    ? 'Periodo gratuito encerrado'
                    : daysLeft === 0
                      ? 'Acesso encerra hoje'
                      : `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}`}
                </p>
                <p className={`text-xs ${isExpired ? 'text-rose-600' : 'text-amber-700'}`}>
                  Data limite: {accessLimit.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}

          {/* Pro subscription info */}
          {isPro && subscription && (
            <div className="mt-4 space-y-2 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div>Status: <span className="font-semibold capitalize">{subscription.status}</span></div>
              {subscription.payer_email && <div>Pagador: {subscription.payer_email}</div>}
              {subscription.next_payment_date && (() => {
                const nextDate = new Date(subscription.next_payment_date)
                const isFirstCharge = nextDate <= now
                const displayDate = isFirstCharge
                  ? new Date(nextDate.setMonth(nextDate.getMonth() + 1))
                  : nextDate
                return (
                  <div>
                    Proximo pagamento:{' '}
                    {displayDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                )
              })()}
              <div className="border-t border-slate-200 pt-3">
                <CancelSubscriptionButton />
              </div>
            </div>
          )}
        </section>

        {/* Upgrade CTA */}
        {!isPro && (
          <section className="rounded border border-slate-200 bg-white p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--cta)]/10 text-[var(--cta)]">
                <Rocket size={18} />
              </div>
              <div className="flex-1">
                <h3 className="font-condensed text-lg font-bold uppercase tracking-wide text-slate-800">
                  Upgrade para VSPro
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Acesso ilimitado a todas as funcionalidades da plataforma por apenas R$ -/mes.
                </p>

                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {[
                    'Alunos, instrutores e agendamentos ilimitados',
                    'Integração completa com Mercado Pago',
                    'Gestão de pacotes, trips e cupons',
                    'Relatórios e histórico financeiro',
                    'Suporte prioritário',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  <Button variant="primary" disabled>
                    -
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
