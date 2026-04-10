'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Filter, RefreshCcw, Search, TicketPercent, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { refundSale } from '@/actions/sales-history'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { useToast } from '@/components/ui/toaster'
import type { SalesHistoryEntry } from '@/lib/types'
import { formatPrice } from '@/lib/utils'

interface Props {
  sales: SalesHistoryEntry[]
}

const PAGE_SIZE = 25

export function SalesHistoryPageClient({ sales }: Props) {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const [currentPage, setCurrentPage] = useState(1)
  const [filterType, setFilterType] = useState('')
  const [filterOrigin, setFilterOrigin] = useState<'online' | 'presencial' | ''>('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterQuery, setFilterQuery] = useState('')
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [refundModalSale, setRefundModalSale] = useState<SalesHistoryEntry | null>(null)
  const [refundReason, setRefundReason] = useState('')

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      if (filterType && sale.kind !== filterType) return false
      if (filterOrigin && sale.origin !== filterOrigin) return false

      const saleDate = sale.created_at.slice(0, 10)
      if (filterFrom && saleDate < filterFrom) return false
      if (filterTo && saleDate > filterTo) return false

      if (filterQuery) {
        const haystack = [
          sale.title,
          sale.customer_name,
          sale.customer_email ?? '',
          sale.customer_phone ?? '',
          sale.external_reference ?? '',
          sale.mercadopago_payment_id ? String(sale.mercadopago_payment_id) : '',
          sale.coupon_usage.join(' '),
        ]
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(filterQuery.toLowerCase())) return false
      }

      return true
    })
  }, [sales, filterFrom, filterOrigin, filterQuery, filterTo, filterType])

  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredSales.slice(start, start + PAGE_SIZE)
  }, [currentPage, filteredSales])

  useEffect(() => {
    setCurrentPage(1)
  }, [filterFrom, filterOrigin, filterQuery, filterTo, filterType])

  function clearFilters() {
    setFilterType('')
    setFilterOrigin('')
    setFilterFrom('')
    setFilterTo('')
    setFilterQuery('')
  }

  async function handleRefund() {
    if (!refundModalSale?.can_refund) return
    if (!refundReason.trim()) {
      showError('Informe o motivo do reembolso.', 'Descreva resumidamente por que a venda esta sendo reembolsada.')
      return
    }

    const sale = refundModalSale
    setRefundingId(sale.id)

    try {
      const formData = new FormData()
      formData.set('sale_id', sale.id)
      formData.set('sale_kind', sale.kind)
      formData.set('refund_reason', refundReason.trim())

      const result = await refundSale(formData)
      if (!result.success) {
        showError('Não foi possível reembolsar a venda.', result.error)
        return
      }

      success('Venda reembolsada com sucesso no Mercado Pago.')
      setRefundModalSale(null)
      setRefundReason('')
      router.refresh()
    } catch (error) {
      showError(
        'Não foi possível reembolsar a venda.',
        error instanceof Error ? error.message : 'Erro inesperado ao processar o reembolso.',
      )
    } finally {
      setRefundingId(null)
    }
  }

  return (
    <div className="dashboard-page">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Histórico de vendas
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Consulte as vendas da plataforma, filtre os registros e execute reembolsos no Mercado Pago.
        </p>
      </div>

      <section className="mb-6 rounded border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-full bg-[var(--primary)]/10 p-2 text-[var(--primary)]">
            <Filter size={16} />
          </div>
          <div>
            <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">
              Filtros do historico
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Busque por cliente, referencia, tipo de venda, periodo ou uso de cupom.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Tipo</label>
            <select
              value={filterType}
              onChange={(event) => setFilterType(event.target.value)}
              className="h-10 rounded border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="single_lesson">Aula avulsa</option>
              <option value="package">Pacote</option>
              <option value="trip">Trip</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Origem</label>
            <select
              value={filterOrigin}
              onChange={(event) => setFilterOrigin(event.target.value as 'online' | 'presencial' | '')}
              className="h-10 rounded border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="">Todas</option>
              <option value="online">Online</option>
              <option value="presencial">Presencial</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">De</label>
            <Input type="date" value={filterFrom} onChange={(event) => setFilterFrom(event.target.value)} icon={<CalendarDays size={14} />} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Ate</label>
            <Input type="date" value={filterTo} onChange={(event) => setFilterTo(event.target.value)} icon={<CalendarDays size={14} />} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Busca</label>
            <Input
              value={filterQuery}
              onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="Cliente ou referência"
              icon={<Search size={14} />}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">
            Tabela de vendas
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {filteredSales.length} venda{filteredSales.length !== 1 ? 's' : ''} encontrada{filteredSales.length !== 1 ? 's' : ''}
          </p>
        </div>

        {filteredSales.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Nenhuma venda encontrada para os filtros atuais.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Venda</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3 whitespace-nowrap">Data</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Valor</th>
                    <th className="px-4 py-3">Origem</th>
                    <th className="px-4 py-3 whitespace-nowrap">Meio de pagto.</th>
                    <th className="px-4 py-3">Cupom</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSales.map((sale) => (
                    <tr key={`${sale.kind}:${sale.id}`} className="align-middle hover:bg-slate-50/60">
                      <td className="px-4 py-3 max-w-[180px]">
                        <div className="font-medium text-slate-800 truncate">{sale.title}</div>
                        {sale.external_reference && (
                          <div className="mt-0.5 max-w-[160px] truncate text-xs text-slate-400" title={sale.external_reference}>
                            {sale.external_reference}
                          </div>
                        )}
                        {sale.mercadopago_payment_id && (
                          <div className="mt-0.5 text-xs text-slate-400">MP: {sale.mercadopago_payment_id}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 max-w-[160px]">
                        <div className="truncate text-sm font-medium text-slate-800">{sale.customer_name}</div>
                        {sale.customer_phone && <div className="text-xs text-slate-400">{sale.customer_phone}</div>}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                        <div>{new Date(sale.created_at).toLocaleDateString('pt-BR')}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(sale.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className="font-condensed text-lg font-bold text-[var(--primary)]">
                          {formatPrice(Number(sale.amount))}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${sale.origin === 'online' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                          {sale.origin === 'online' ? 'Online' : 'Presencial'}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                        {sale.payment_method_label}
                      </td>

                      <td className="px-4 py-3">
                        {sale.coupon_usage.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {sale.coupon_usage.map((coupon) => (
                              <span key={coupon} className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">
                                {coupon}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className={statusPillClass(sale.payment_status)}>
                          {statusLabel(sale.payment_status)}
                        </span>
                        <div className="mt-1 text-xs text-slate-400">{sale.sale_status}</div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        {sale.can_refund ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRefundModalSale(sale)
                              setRefundReason('')
                            }}
                            disabled={refundingId === sale.id}
                          >
                            <RefreshCcw size={14} />
                            {refundingId === sale.id ? 'Reembolsando...' : 'Reembolsar'}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {paginatedSales.map((sale) => (
                <article key={`${sale.kind}:${sale.id}`} className="rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800">{sale.title}</div>
                      <div className="mt-1 text-xs text-slate-400">{sale.external_reference ?? '--'}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={statusPillClass(sale.payment_status)}>{statusLabel(sale.payment_status)}</span>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${sale.origin === 'online' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                        {sale.origin === 'online' ? 'Online' : 'Presencial'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 text-sm text-slate-600">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Cliente</div>
                      <div className="font-medium text-slate-800">{sale.customer_name}</div>
                      {sale.customer_email && <div>{sale.customer_email}</div>}
                      {sale.customer_phone && <div>{sale.customer_phone}</div>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Valor</div>
                        <div className="font-condensed text-2xl font-bold text-[var(--primary)]">
                          {formatPrice(Number(sale.amount))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Meio</div>
                        <div>{sale.payment_method_label}</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Data</div>
                      <div>{new Date(sale.created_at).toLocaleDateString('pt-BR')}</div>
                    </div>

                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Uso de cupom</div>
                      {sale.coupon_usage.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {sale.coupon_usage.map((coupon) => (
                            <span
                              key={coupon}
                              className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700"
                            >
                              <TicketPercent size={12} />
                              {coupon}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div>--</div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Mercado Pago</div>
                      <div>ID: {sale.mercadopago_payment_id ?? '--'}</div>
                      <div className="text-xs text-slate-400">
                        {sale.mercadopago_status_detail ?? sale.mercadopago_status ?? '--'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    {sale.can_refund ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRefundModalSale(sale)
                          setRefundReason('')
                        }}
                        disabled={refundingId === sale.id}
                      >
                        <RefreshCcw size={14} />
                        {refundingId === sale.id ? 'Reembolsando...' : 'Reembolsar'}
                      </Button>
                    ) : (
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">--</span>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <PaginationControls
              currentPage={currentPage}
              pageSize={PAGE_SIZE}
              totalItems={filteredSales.length}
              onPageChange={setCurrentPage}
              itemLabel="vendas"
            />
          </>
        )}
      </section>

      {refundModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="relative w-full max-w-lg rounded border border-slate-200 bg-slate-50 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
                  Reembolsar venda
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Informe o motivo do reembolso para {refundModalSale.customer_name}.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (refundingId) return
                  setRefundModalSale(null)
                  setRefundReason('')
                }}
                aria-label="Fechar modal de reembolso"
              >
                <X size={18} />
              </Button>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <div className="font-semibold text-slate-800">{refundModalSale.title}</div>
                <div className="mt-1">{formatPrice(Number(refundModalSale.amount))}</div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Motivo do reembolso *</label>
                <textarea
                  value={refundReason}
                  onChange={(event) => setRefundReason(event.target.value)}
                  rows={4}
                  placeholder="Ex: cliente cancelou antes da confirmacao da aula."
                  className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 resize-none focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (refundingId) return
                    setRefundModalSale(null)
                    setRefundReason('')
                  }}
                >
                  Cancelar
                </Button>
                <Button type="button" variant="primary" onClick={handleRefund} disabled={refundingId === refundModalSale.id}>
                  {refundingId === refundModalSale.id ? 'Reembolsando...' : 'Confirmar reembolso'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function statusLabel(status: SalesHistoryEntry['payment_status']) {
  if (status === 'paid') return 'Pago'
  if (status === 'pending') return 'Pendente'
  if (status === 'refunded') return 'Reembolsado'
  return 'Falhou'
}

function statusPillClass(status: SalesHistoryEntry['payment_status']) {
  if (status === 'paid') {
    return 'inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700'
  }

  if (status === 'pending') {
    return 'inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-700'
  }

  if (status === 'refunded') {
    return 'inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-700'
  }

  return 'inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-rose-700'
}
