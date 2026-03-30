'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, FileText, Filter, Landmark, Search, Wallet, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createCommissionPayment } from '@/actions/commission-payments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { useToast } from '@/components/ui/toaster'
import type { Instructor, InstructorCommissionPayment } from '@/lib/types'
import { formatPrice, initials } from '@/lib/utils'

interface Props {
  instructors: Instructor[]
  payments: InstructorCommissionPayment[]
}

export function CommissionPaymentForm({ instructors, payments }: Props) {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [filterInstructorId, setFilterInstructorId] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterQuery, setFilterQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      if (filterInstructorId && payment.instructor_id !== filterInstructorId) return false
      if (filterFrom && payment.payment_date < filterFrom) return false
      if (filterTo && payment.payment_date > filterTo) return false

      if (filterQuery) {
        const haystack = [
          payment.instructor?.full_name ?? '',
          payment.notes ?? '',
          String(payment.amount),
        ]
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(filterQuery.toLowerCase())) return false
      }

      return true
    })
  }, [payments, filterFrom, filterInstructorId, filterQuery, filterTo])

  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredPayments.slice(start, start + pageSize)
  }, [currentPage, filteredPayments])

  useEffect(() => {
    setCurrentPage(1)
  }, [filterFrom, filterInstructorId, filterQuery, filterTo])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const form = event.currentTarget

    try {
      const formData = new FormData(form)
      const result = await createCommissionPayment(formData)

      if (!result.success) {
        setError(result.error)
        showError('Não foi possível registrar o pagamento.', result.error)
        return
      }

      form.reset()
      setCreateModalOpen(false)
      success('Pagamento de comissão registrado com sucesso.')
      router.refresh()
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Erro inesperado ao registrar o pagamento.'
      setError(message)
      showError('Não foi possível registrar o pagamento.', message)
    } finally {
      setLoading(false)
    }
  }

  function clearFilters() {
    setFilterInstructorId('')
    setFilterFrom('')
    setFilterTo('')
    setFilterQuery('')
  }

  return (
    <>
      <div className="dashboard-page">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
              Registrar pagamento de comissão
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Consulte o histórico de repasses dos instrutores e registre novos pagamentos manualmente.
            </p>
          </div>

          <Button type="button" variant="primary" onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto">
            <Landmark size={15} /> Registrar pagamento
          </Button>
        </div>

        <section className="mb-6 rounded border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-full bg-[var(--primary)]/10 p-2 text-[var(--primary)]">
              <Filter size={16} />
            </div>
            <div>
              <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">
                Filtros do histórico
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Refine por instrutor, periodo ou texto para localizar repasses específicos.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Instrutor</label>
              <select
                value={filterInstructorId}
                onChange={(event) => setFilterInstructorId(event.target.value)}
                className="h-11 rounded-sm border border-slate-200 px-3 text-sm text-slate-800 bg-white focus:outline-none focus:border-[var(--primary)]"
              >
                <option value="">Todos</option>
                {instructors.map((instructor) => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">De</label>
              <Input type="date" value={filterFrom} onChange={(event) => setFilterFrom(event.target.value)} icon={<CalendarDays size={14} />} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Até</label>
              <Input type="date" value={filterTo} onChange={(event) => setFilterTo(event.target.value)} icon={<CalendarDays size={14} />} />
            </div>

            <div className="flex flex-col gap-1.5 xl:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Busca</label>
              <Input
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                placeholder="Nome do instrutor, valor ou observacao"
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
              Histórico de pagamentos
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredPayments.length} registro{filteredPayments.length !== 1 ? 's' : ''} encontrado{filteredPayments.length !== 1 ? 's' : ''}
            </p>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Nenhum pagamento encontrado para os filtros atuais.
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">Instrutor</th>
                      <th className="px-5 py-3">Data do pagamento</th>
                      <th className="px-5 py-3">Valor</th>
                      <th className="px-5 py-3">Observações</th>
                      <th className="px-5 py-3">Registrado em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedPayments.map((payment) => (
                      <tr key={payment.id} className="align-top">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {payment.instructor?.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={payment.instructor.photo_url} alt={payment.instructor.full_name} className="h-11 w-11 rounded-full object-cover" />
                            ) : (
                              <div
                                className="flex h-11 w-11 items-center justify-center rounded-full font-condensed text-sm font-bold text-white"
                                style={{ background: payment.instructor?.color ?? '#0f172a' }}
                              >
                                {initials(payment.instructor?.full_name ?? 'Instrutor')}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-slate-800">{payment.instructor?.full_name ?? 'Instrutor'}</div>
                              <div className="text-xs text-slate-400">ID {payment.instructor_id.slice(0, 8)}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap">
                          {new Date(`${payment.payment_date}T00:00:00`).toLocaleDateString('pt-BR')}
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-condensed text-2xl font-bold text-[var(--primary)]">
                            {formatPrice(Number(payment.amount))}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm leading-relaxed text-slate-600">
                          {payment.notes || '--'}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
                          {new Date(payment.created_at).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 p-4 md:hidden">
                {paginatedPayments.map((payment) => (
                  <article key={payment.id} className="rounded border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      {payment.instructor?.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={payment.instructor.photo_url} alt={payment.instructor.full_name} className="h-11 w-11 rounded-full object-cover" />
                      ) : (
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-full font-condensed text-sm font-bold text-white"
                          style={{ background: payment.instructor?.color ?? '#0f172a' }}
                        >
                          {initials(payment.instructor?.full_name ?? 'Instrutor')}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800">{payment.instructor?.full_name ?? 'Instrutor'}</div>
                        <div className="mt-1 text-xs text-slate-400">ID {payment.instructor_id.slice(0, 8)}</div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-slate-600">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Pagamento</div>
                          <div>{new Date(`${payment.payment_date}T00:00:00`).toLocaleDateString('pt-BR')}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Registrado em</div>
                          <div>{new Date(payment.created_at).toLocaleDateString('pt-BR')}</div>
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Valor</div>
                        <div className="font-condensed text-2xl font-bold text-[var(--primary)]">
                          {formatPrice(Number(payment.amount))}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Observações</div>
                        <div>{payment.notes || '--'}</div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <PaginationControls
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={filteredPayments.length}
                onPageChange={setCurrentPage}
                itemLabel="registros"
              />
            </>
          )}
        </section>
      </div>

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded border border-slate-200 bg-slate-50 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
                  Registrar pagamento
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Informe o instrutor, valor, data e observações do repasse.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCreateModalOpen(false)} aria-label="Fechar modal de pagamento de comissão">
                <X size={18} />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div className="space-y-6 rounded border border-slate-200 bg-white p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Instrutor *</label>
                    <select
                      name="instructor_id"
                      className="h-11 rounded-sm border border-slate-200 px-3 text-sm text-slate-800 bg-white focus:outline-none focus:border-[var(--primary)]"
                      defaultValue=""
                      required
                    >
                      <option value="" disabled>Selecione um instrutor</option>
                      {instructors.map((instructor) => (
                        <option key={instructor.id} value={instructor.id}>
                          {instructor.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Valor da comissão *</label>
                    <Input
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      placeholder="150.00"
                      icon={<Wallet size={14} />}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Data do pagamento *</label>
                    <Input
                      name="payment_date"
                      type="date"
                      required
                      icon={<CalendarDays size={14} />}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Observações</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400 pointer-events-none">
                      <FileText size={14} />
                    </span>
                    <textarea
                      name="notes"
                      rows={4}
                      placeholder="Ex: repasse referente a aulas particulares da primeira quinzena."
                      className="w-full rounded-sm border border-slate-200 pl-10 pr-3 py-2 text-sm text-slate-800 bg-white resize-none focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => setCreateModalOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="primary" disabled={loading || instructors.length === 0}>
                    {loading ? 'Salvando...' : 'Registrar pagamento'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
