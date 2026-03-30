'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, X } from 'lucide-react'
import { createManualTripRegistration, updateManualTripRegistration } from '@/actions/trips'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toaster'
import { formatPrice } from '@/lib/utils'
import type { Trip, TripRegistration } from '@/lib/types'

interface Props {
  trip: Trip
  registrations: TripRegistration[]
}

export function TripRegistrationsSection({ trip, registrations }: Props) {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingRegistration, setEditingRegistration] = useState<TripRegistration | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setSubmitError('')

    const formData = new FormData(event.currentTarget)
    const result = editingRegistration
      ? await updateManualTripRegistration(editingRegistration.id, formData)
      : await createManualTripRegistration(trip.id, formData)

    if (!result.success) {
      setSubmitError(result.error)
      showError(
        editingRegistration ? 'Nao foi possivel salvar a inscricao.' : 'Nao foi possivel registrar a inscricao.',
        result.error,
      )
      setLoading(false)
      return
    }

    success(editingRegistration ? 'Inscricao atualizada com sucesso.' : 'Participante registrado com sucesso.')
    setCreateModalOpen(false)
    setEditingRegistration(null)
    setLoading(false)
    router.refresh()
  }

  function openCreateModal() {
    setSubmitError('')
    setEditingRegistration(null)
    setCreateModalOpen(true)
  }

  function openEditModal(registration: TripRegistration) {
    setSubmitError('')
    setEditingRegistration(registration)
    setCreateModalOpen(true)
  }

  return (
    <>
      <section className="rounded border border-slate-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-condensed text-xl font-bold uppercase tracking-wide text-slate-800">
              Inscritos na trip
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Registre pagamentos presenciais e acompanhe quem ja garantiu a vaga.
            </p>
          </div>
          <Button type="button" size="sm" onClick={openCreateModal}>
            Registrar inscricao manual
          </Button>
        </div>

        {registrations.length === 0 ? (
          <div className="rounded border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Nenhuma pessoa registrada nesta trip ainda.
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Pessoa</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Forma de pagamento</th>
                    <th className="px-4 py-3">Valor pago</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Registrado em</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {registrations.map((registration) => (
                    <tr key={registration.id}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{registration.full_name}</div>
                        {registration.notes && <div className="mt-1 text-xs text-slate-400">{registration.notes}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{registration.email}</div>
                        <div className="text-xs text-slate-400">{registration.phone ?? 'Sem telefone'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatPaymentMethodLabel(registration.payment_method)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{formatPrice(Number(registration.amount))}</td>
                      <td className="px-4 py-3">
                        <Badge variant={registration.payment_status === 'paid' ? 'success' : registration.status === 'cancelled' ? 'danger' : 'neutral'}>
                          {registration.payment_status === 'paid' ? 'Pago' : registration.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(registration.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isManualRegistration(registration) ? (
                          <Button type="button" variant="ghost" size="sm" onClick={() => openEditModal(registration)}>
                            <Pencil size={14} /> Editar
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">Checkout online</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-3 md:hidden">
              {registrations.map((registration) => (
                <div key={registration.id} className="rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800">{registration.full_name}</div>
                      <div className="text-xs text-slate-400">{registration.email}</div>
                    </div>
                    <Badge variant={registration.payment_status === 'paid' ? 'success' : registration.status === 'cancelled' ? 'danger' : 'neutral'}>
                      {registration.payment_status === 'paid' ? 'Pago' : registration.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                    </Badge>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <div>Telefone: {registration.phone ?? 'Sem telefone'}</div>
                    <div>Pagamento: {formatPaymentMethodLabel(registration.payment_method)}</div>
                    <div>Valor pago: {formatPrice(Number(registration.amount))}</div>
                    <div>Registrado em: {new Date(registration.created_at).toLocaleDateString('pt-BR')}</div>
                    {registration.notes && <div>Obs.: {registration.notes}</div>}
                  </div>
                  {isManualRegistration(registration) && (
                    <div className="mt-3 flex justify-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => openEditModal(registration)}>
                        <Pencil size={14} /> Editar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="font-condensed text-xl font-bold uppercase text-slate-900">
                  {editingRegistration ? 'Editar inscricao manual' : 'Registrar inscricao manual'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingRegistration
                    ? 'Atualize os dados que foram lancados manualmente para esse participante.'
                    : 'Informe quem entrou na trip presencialmente e como foi feito o pagamento.'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setCreateModalOpen(false)
                  setEditingRegistration(null)
                }}
                aria-label="Fechar modal de inscricao manual"
              >
                <X size={18} />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Nome completo *</label>
                  <Input name="full_name" required placeholder="Nome da pessoa" defaultValue={editingRegistration?.full_name ?? ''} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">E-mail *</label>
                  <Input name="email" type="email" required placeholder="pessoa@email.com" defaultValue={editingRegistration?.email ?? ''} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Telefone</label>
                  <Input name="phone" type="tel" placeholder="+55 11 99999-9999" defaultValue={editingRegistration?.phone ?? ''} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Situacao do pagamento *</label>
                  <select
                    name="payment_status"
                    defaultValue={editingRegistration?.payment_status === 'pending' ? 'pending' : 'paid'}
                    className="h-11 rounded-sm border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-[var(--primary)] focus:outline-none"
                  >
                    <option value="paid">Pago</option>
                    <option value="pending">Pagar no local</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Forma de pagamento *</label>
                  <select
                    name="payment_method"
                    defaultValue={editingRegistration?.payment_method ?? 'pix'}
                    className="h-11 rounded-sm border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-[var(--primary)] focus:outline-none"
                  >
                    <option value="pix">Pix presencial</option>
                    <option value="credit_card">Credito na maquininha</option>
                    <option value="debit_card">Debito na maquininha</option>
                    <option value="cash">Dinheiro</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Valor pago *</label>
                  <Input name="amount" type="number" min="0" step="0.01" required defaultValue={editingRegistration?.amount ?? trip.price} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Observacoes</label>
                  <textarea
                    name="notes"
                    rows={4}
                    placeholder="Ex.: pagamento na recepcao, acompanhado pelos pais, parcelado na maquininha."
                    defaultValue={editingRegistration?.notes ?? ''}
                    className="w-full resize-none rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10"
                  />
                </div>
              </div>

              {submitError && (
                <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {submitError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : editingRegistration ? 'Salvar alteracoes' : 'Registrar pagamento'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setCreateModalOpen(false)
                    setEditingRegistration(null)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function isManualRegistration(registration: TripRegistration) {
  return !registration.external_reference && !registration.mercadopago_payment_id
}

function formatPaymentMethodLabel(paymentMethod: TripRegistration['payment_method']) {
  switch (paymentMethod) {
    case 'pix':
      return 'Pix'
    case 'credit_card':
      return 'Cartao de credito'
    case 'debit_card':
      return 'Cartao de debito'
    case 'cash':
      return 'Dinheiro'
    default:
      return 'Nao informado'
  }
}
