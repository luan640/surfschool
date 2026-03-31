import { redirect } from 'next/navigation'
import { getMercadoPagoConnection, getSchoolSettings } from '@/actions/dashboard'
import { CopyBookingLinkButton } from '@/components/dashboard/CopyBookingLinkButton'
import { DisconnectMercadoPagoButton } from '@/components/dashboard/settings/DisconnectMercadoPagoButton'
import { Banner, ConnectionBadge } from '@/components/dashboard/settings/SettingsStatus'
import { Button } from '@/components/ui/button'
import { CreditCard, Globe } from 'lucide-react'

interface Props {
  searchParams?: Promise<{ mp?: string }>
}

export default async function PaymentMethodsPage({ searchParams }: Props) {
  const school = await getSchoolSettings()
  const connection = await getMercadoPagoConnection()
  if (!school) redirect('/auth/login')

  const params = searchParams ? await searchParams : undefined
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://vamosurfar.app').replace(/\/$/, '')
  const bookingUrl = `${appUrl}/${school.slug}`

  return (
    <div className="dashboard-page-compact">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Meio de pagamento
        </h1>
        <p className="mt-1 text-sm text-slate-400">Configure como a escola recebe pagamentos e acompanhe o estado da conexao.</p>
      </div>

      {params?.mp === 'connected' && <Banner tone="success" text="Mercado Pago conectado com sucesso." />}
      {params?.mp === 'disconnected' && <Banner tone="warning" text="Conta do Mercado Pago desvinculada." />}
      {params?.mp === 'error' && <Banner tone="error" text="Nao foi possivel concluir a autenticacao do Mercado Pago." />}

      <div className="mb-6 flex items-center gap-3 rounded border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
        <Globe size={16} className="shrink-0 text-[var(--primary)]" />
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-xs font-bold uppercase tracking-wide text-[var(--primary)]">Link de agendamento dos alunos</p>
          <p className="truncate font-mono text-sm text-slate-700">{bookingUrl}</p>
        </div>
        <CopyBookingLinkButton url={bookingUrl} />
      </div>

      <section className="space-y-4 rounded border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Mercado Pago</h2>
            <p className="mt-1 text-sm text-slate-500">Conecte a conta da escola para receber os pagamentos diretamente nela.</p>
          </div>
          <ConnectionBadge status={connection?.status ?? 'disconnected'} />
        </div>

        <div className="space-y-2 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <CreditCard size={15} className="text-slate-500" />
            <span>Conta conectada: {connection?.mp_user_id ?? 'nenhuma'}</span>
          </div>
          <div>Conectado em: {connection?.connected_at ? new Date(connection.connected_at).toLocaleString('pt-BR') : '--'}</div>
          <div>Expira em: {connection?.expires_at ? new Date(connection.expires_at).toLocaleString('pt-BR') : '--'}</div>
          {connection?.last_error && <div className="text-rose-600">Ultimo erro: {connection.last_error}</div>}
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <a href="/api/integrations/mercadopago/connect" className="inline-flex h-10 items-center justify-center rounded bg-[#009ee3] px-4 text-sm font-bold uppercase text-white">
            {connection?.status === 'connected' ? 'Reconectar Mercado Pago' : 'Conectar Mercado Pago'}
          </a>
          {connection?.status === 'connected' && <DisconnectMercadoPagoButton />}
        </div>
      </section>
    </div>
  )
}
