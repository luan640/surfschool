'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { CalendarDays, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import type { PurchaseEntry, PurchaseKind } from '@/actions/purchases'

const KIND_LABEL: Record<PurchaseKind, string> = {
  booking: 'Aula',
  package: 'Pacote',
  trip: 'Trip',
}

const KIND_CLASS: Record<PurchaseKind, string> = {
  booking: 'bg-sky-100 text-sky-700',
  package: 'bg-violet-100 text-violet-700',
  trip: 'bg-emerald-100 text-emerald-700',
}

interface ActiveFilters {
  kind: string
  origin: string
  from: string
  to: string
  query: string
}

interface Props {
  purchases: PurchaseEntry[]
  total: number
  page: number
  totalPages: number
  filters: ActiveFilters
}

export function PurchasesPageClient({ purchases, total, page, totalPages, filters }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const [queryInput, setQueryInput] = useState(filters.query)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setQueryInput(filters.query) }, [filters.query])

  const navigate = useCallback((patch: Partial<ActiveFilters & { page: number }>) => {
    const next = { ...filters, page: 1, ...patch }
    const params = new URLSearchParams()
    if (next.kind)   params.set('kind', next.kind)
    if (next.origin) params.set('origin', next.origin)
    if (next.from)   params.set('from', next.from)
    if (next.to)     params.set('to', next.to)
    if (next.query)  params.set('q', next.query)
    if ((next.page ?? 1) > 1) params.set('page', String(next.page))
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }, [filters, pathname, router])

  function handleSelect(key: keyof ActiveFilters) {
    return (e: React.ChangeEvent<HTMLSelectElement>) => navigate({ [key]: e.target.value })
  }

  function handleDate(key: 'from' | 'to') {
    return (e: React.ChangeEvent<HTMLInputElement>) => navigate({ [key]: e.target.value })
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQueryInput(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => navigate({ query: val }), 400)
  }

  function clearFilters() {
    setQueryInput('')
    router.push(pathname)
  }

  const hasFilters = filters.kind || filters.origin || filters.from || filters.to || filters.query

  const totalAmount = purchases.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="dashboard-page overflow-x-hidden">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Compras
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Todos os agendamentos, pacotes e trips da escola.
        </p>
      </div>

      {/* Filtros */}
      <section className="mb-6 rounded border border-slate-200 bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Tipo</label>
            <select
              value={filters.kind}
              onChange={handleSelect('kind')}
              className="h-10 rounded border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="booking">Aula</option>
              <option value="package">Pacote</option>
              <option value="trip">Trip</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Origem</label>
            <select
              value={filters.origin}
              onChange={handleSelect('origin')}
              className="h-10 rounded border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[var(--primary)] focus:outline-none"
            >
              <option value="">Todas</option>
              <option value="online">Online</option>
              <option value="presencial">Presencial</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">De</label>
            <Input
              type="date"
              value={filters.from}
              onChange={handleDate('from')}
              icon={<CalendarDays size={14} />}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Até</label>
            <Input
              type="date"
              value={filters.to}
              onChange={handleDate('to')}
              icon={<CalendarDays size={14} />}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Busca</label>
            <Input
              value={queryInput}
              onChange={handleQueryChange}
              placeholder="Cliente ou instrutor"
              icon={<Search size={14} />}
            />
          </div>
        </div>

        {hasFilters && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-bold uppercase tracking-wide text-slate-400 hover:text-slate-600"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </section>

      {/* Tabela */}
      <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">
              Resultado
            </h2>
            <p className="mt-0.5 text-sm text-slate-400">
              {total} compra{total !== 1 ? 's' : ''} · total desta página{' '}
              <span className="font-semibold text-slate-700">{formatPrice(totalAmount)}</span>
            </p>
          </div>
        </div>

        {purchases.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            Nenhuma compra encontrada para os filtros atuais.
          </div>
        ) : (
          <>
            <div className="overflow-hidden">
              <table className="min-w-full table-fixed divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <th className="hidden px-2 py-3 whitespace-nowrap xl:table-cell">ID</th>
                    <th className="px-2 py-3 sm:px-3 lg:px-4">Tipo</th>
                    <th className="px-2 py-3 sm:px-3 lg:px-4">Descrição</th>
                    <th className="px-2 py-3 sm:px-3 lg:px-4">Cliente</th>
                    <th className="px-2 py-3 whitespace-nowrap sm:px-3 lg:px-4">Data compra</th>
                    <th className="hidden px-2 py-3 whitespace-nowrap lg:table-cell lg:px-4">Data aula</th>
                    <th className="px-2 py-3 text-right whitespace-nowrap sm:px-3 lg:px-4">Valor</th>
                    <th className="px-2 py-3 sm:px-3 lg:px-4">Status</th>
                    <th className="hidden px-2 py-3 md:table-cell md:px-3 lg:px-4">Origem</th>
                    <th className="hidden px-2 py-3 lg:table-cell lg:px-4">Pagamento</th>
                    <th className="hidden px-2 py-3 whitespace-nowrap xl:table-cell">Cód. MP</th>
                    <th className="hidden px-2 py-3 2xl:table-cell">Cupom</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchases.map((p) => (
                    <tr key={`${p.kind}:${p.id}`} className="align-top hover:bg-slate-50/60">
                      <td className="hidden px-2 py-3 xl:table-cell">
                        <span className="block break-all font-mono text-xs text-slate-500">{p.id}</span>
                      </td>
                      <td className="px-2 py-3 sm:px-3 lg:px-4">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide sm:px-2.5 sm:text-xs ${KIND_CLASS[p.kind]}`}>
                          {KIND_LABEL[p.kind]}
                        </span>
                      </td>

                      <td className="px-2 py-3 sm:px-3 lg:px-4">
                        <div className="text-sm font-medium leading-snug text-slate-800 break-words">{p.title}</div>
                        {p.instructor_name && (
                          <div className="text-xs text-slate-400">{p.instructor_name}</div>
                        )}
                        <div className="mt-1 break-all font-mono text-[10px] text-slate-400 xl:hidden">{p.id}</div>
                      </td>

                      <td className="px-2 py-3 sm:px-3 lg:px-4">
                        <div className="text-sm font-medium leading-snug text-slate-800 break-words">{p.customer_name}</div>
                        {p.customer_phone && <div className="text-xs text-slate-400">{p.customer_phone}</div>}
                      </td>

                      <td className="px-2 py-3 whitespace-nowrap text-sm text-slate-600 sm:px-3 lg:px-4">
                        {new Date(p.created_at).toLocaleDateString('pt-BR')}
                      </td>

                      <td className="hidden px-2 py-3 whitespace-nowrap text-sm text-slate-600 lg:table-cell lg:px-4">
                        {p.lesson_date
                          ? new Date(`${p.lesson_date}T00:00:00`).toLocaleDateString('pt-BR')
                          : <span className="text-slate-300">—</span>}
                      </td>

                      <td className="px-2 py-3 text-right whitespace-nowrap sm:px-3 lg:px-4">
                        <span className="font-condensed text-base font-bold text-[var(--primary)] sm:text-lg">
                          {formatPrice(p.amount)}
                        </span>
                      </td>

                      <td className="px-2 py-3 sm:px-3 lg:px-4">
                        {p.payment_status === 'refunded' ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:px-2.5 sm:text-xs">
                            Reembolsado
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 sm:px-2.5 sm:text-xs">
                            Pago
                          </span>
                        )}
                      </td>

                      <td className="hidden px-2 py-3 md:table-cell md:px-3 lg:px-4">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:text-xs ${p.origin === 'online' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                          {p.origin === 'online' ? 'Online' : 'Presencial'}
                        </span>
                      </td>

                      <td className="hidden px-2 py-3 text-sm text-slate-600 lg:table-cell lg:px-4">
                        {p.payment_method ?? <span className="text-slate-300">—</span>}
                      </td>

                      <td className="hidden px-2 py-3 whitespace-nowrap xl:table-cell">
                        {p.mercadopago_payment_id
                          ? <span className="font-mono text-xs text-slate-500">{p.mercadopago_payment_id}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>

                      <td className="hidden px-2 py-3 2xl:table-cell">
                        {p.coupon_codes.length > 0
                          ? (
                            <div className="flex flex-wrap gap-1">
                              {p.coupon_codes.map((c) => (
                                <span key={c} className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                                  {c}
                                </span>
                              ))}
                            </div>
                          )
                          : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Página {page} de {totalPages} · {total} compra{total !== 1 ? 's' : ''}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => navigate({ page: page - 1 })}
                  >
                    <ChevronLeft size={14} /> Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => navigate({ page: page + 1 })}
                  >
                    Próxima <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
