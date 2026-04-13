import { redirect } from 'next/navigation'
import { getMercadoPagoConnection, getSchoolSettings } from '@/actions/dashboard'
import { DisconnectMercadoPagoButton } from '@/components/dashboard/settings/DisconnectMercadoPagoButton'
import { Banner, ConnectionBadge } from '@/components/dashboard/settings/SettingsStatus'
import { Button } from '@/components/ui/button'
import { CreditCard, Info, Banknote, Zap } from 'lucide-react'

interface Props {
  searchParams?: Promise<{ mp?: string }>
}

export default async function PaymentMethodsPage({ searchParams }: Props) {
  const school = await getSchoolSettings()
  const connection = await getMercadoPagoConnection()
  if (!school) redirect('/auth/login')

  const params = searchParams ? await searchParams : undefined

  return (
    <div className="dashboard-page-compact">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Pagamento online
        </h1>
        <p className="mt-1 text-sm text-slate-400">Configure como a escola recebe pagamentos e acompanhe o estado da conexao.</p>
      </div>

      {params?.mp === 'connected' && <Banner tone="success" text="Mercado Pago conectado com sucesso." />}
      {params?.mp === 'disconnected' && <Banner tone="warning" text="Conta do Mercado Pago desvinculada." />}
      {params?.mp === 'error' && <Banner tone="error" text="Não foi possível concluir a autenticacao do Mercado Pago." />}

      {/* Info about Mercado Pago */}
      <section className="mb-4 rounded border border-blue-100 bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />
          <div className="space-y-3 text-sm text-blue-800">
            <p>
              A integração com o <strong>Mercado Pago</strong> é <strong>opcional</strong>.
              Sem ela, você ainda pode usar a plataforma normalmente — os pagamentos são combinados diretamente com o aluno fora da plataforma.
            </p>
            <p>
              Ao conectar sua conta, o <strong>Mercado Pago</strong> passa a atuar como intermediador:
              os valores pagos pelos alunos são processados e depositados diretamente na sua conta,
              descontadas as taxas da operação.
            </p>
            <div className="space-y-3">
              <p className="font-semibold text-blue-900">Taxas praticadas pelo Mercado Pago:</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex items-center gap-2 rounded border border-blue-200 bg-white px-3 py-2 text-blue-800">
                  <Zap size={14} className="text-emerald-500" />
                  <span><strong>PIX</strong> — 0,99% por transação</span>
                </div>
                <div className="flex items-center gap-2 rounded border border-blue-200 bg-white px-3 py-2 text-blue-800">
                  <CreditCard size={14} className="text-blue-500" />
                  <span><strong>Cartão de crédito</strong> — 4,98% (1x) até 6,79% (12x)</span>
                </div>
              </div>

              {/* Examples */}
              <div className="rounded border border-blue-200 bg-white p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-700">Exemplos para uma aula de R$ 100,00</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Zap size={13} className="text-emerald-500" />
                      PIX (0,99%)
                    </span>
                    <span className="text-slate-500">aluno paga <strong className="text-slate-800">R$ 100,00</strong> → você recebe <strong className="text-emerald-700">R$ 99,01</strong></span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <CreditCard size={13} className="text-blue-500" />
                      Cartão 1x (4,98%)
                    </span>
                    <span className="text-slate-500">aluno paga <strong className="text-slate-800">R$ 100,00</strong> → você recebe <strong className="text-emerald-700">R$ 95,02</strong></span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <CreditCard size={13} className="text-blue-500" />
                      Cartão 12x (6,79%)
                    </span>
                    <span className="text-slate-500">aluno paga <strong className="text-slate-800">R$ 100,00</strong> → você recebe <strong className="text-emerald-700">R$ 93,21</strong></span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-blue-600">
              As taxas são cobradas pelo Mercado Pago e podem variar conforme o tipo de conta e volume de transações.
              Consulte o site do Mercado Pago para valores atualizados.
            </p>
          </div>
        </div>
      </section>

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
