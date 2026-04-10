'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Banknote, RefreshCcw, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toaster'
import { formatPrice } from '@/lib/utils'
import { processOnlineRefund, processManualRefund } from '@/actions/refunds'
import type { RefundablePurchase, RefundEntry } from '@/actions/refunds'
import type { PurchaseKind } from '@/actions/purchases'

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

interface Props {
  refundable: RefundablePurchase[]
  refunded: RefundEntry[]
}

function PurchaseList({
  items,
  selected,
  onSelect,
  emptyMessage,
}: {
  items: RefundablePurchase[]
  selected: RefundablePurchase | null
  onSelect: (p: RefundablePurchase) => void
  emptyMessage: string
}) {
  return (
    <div className="max-h-52 overflow-y-auto rounded border border-slate-200 bg-white">
      {items.length === 0 ? (
        <div className="p-4 text-center text-sm text-slate-400">{emptyMessage}</div>
      ) : (
        items.map((p) => {
          const isSelected = selected?.id === p.id && selected.kind === p.kind
          return (
            <button
              key={`${p.kind}:${p.id}`}
              type="button"
              onClick={() => onSelect(p)}
              className={`flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left text-sm transition-colors last:border-0 hover:bg-slate-50 ${
                isSelected ? 'bg-sky-50 ring-1 ring-inset ring-sky-300' : ''
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${KIND_CLASS[p.kind]}`}>
                    {KIND_LABEL[p.kind]}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${p.origin === 'online' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                    {p.origin === 'online' ? 'Online' : 'Presencial'}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-medium text-slate-800">{p.customer_name}</div>
                <div className="text-xs text-slate-400">
                  {p.title} · {new Date(p.created_at).toLocaleDateString('pt-BR')}
                </div>
                {p.mercadopago_payment_id && (
                  <div className="font-mono text-xs text-slate-400">MP: {p.mercadopago_payment_id}</div>
                )}
              </div>
              <span className="ml-4 shrink-0 font-condensed text-base font-bold text-[var(--primary)]">
                {formatPrice(p.amount)}
              </span>
            </button>
          )
        })
      )}
    </div>
  )
}

export function RefundsPageClient({ refundable, refunded }: Props) {
  const router = useRouter()
  const { success: showSuccess, error: showError } = useToast()

  // ─── MP Refund Modal ──────────────────────────────────────────────────────
  const [mpOpen, setMpOpen] = useState(false)
  const [mpSearch, setMpSearch] = useState('')
  const [mpSelected, setMpSelected] = useState<RefundablePurchase | null>(null)
  const [mpToken, setMpToken] = useState('')
  const [mpReason, setMpReason] = useState('')
  const [mpLoading, setMpLoading] = useState(false)

  const mpPurchases = useMemo(
    () => refundable.filter((p) => p.mercadopago_payment_id !== null),
    [refundable],
  )

  const mpFiltered = useMemo(() => {
    const q = mpSearch.trim().toLowerCase()
    if (!q) return mpPurchases
    return mpPurchases.filter((p) =>
      [p.customer_name, p.title, String(p.mercadopago_payment_id ?? '')].join(' ').toLowerCase().includes(q),
    )
  }, [mpPurchases, mpSearch])

  function closeMpModal() {
    setMpOpen(false)
    setMpSearch('')
    setMpSelected(null)
    setMpToken('')
    setMpReason('')
  }

  async function handleMpRefund() {
    if (!mpSelected) { showError('Selecione uma compra.'); return }
    if (!mpToken.trim()) { showError('Informe a chave de acesso do Mercado Pago.'); return }
    if (!mpReason.trim()) { showError('Informe o motivo do reembolso.'); return }
    setMpLoading(true)
    try {
      const result = await processOnlineRefund(mpSelected.id, mpSelected.kind, mpToken.trim(), mpReason.trim())
      if (!result.success) { showError(result.error); return }
      showSuccess('Reembolso processado com sucesso no Mercado Pago.')
      closeMpModal()
      router.refresh()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setMpLoading(false)
    }
  }

  // ─── Manual Refund Modal ──────────────────────────────────────────────────
  const [manualOpen, setManualOpen] = useState(false)
  const [manualSearch, setManualSearch] = useState('')
  const [manualSelected, setManualSelected] = useState<RefundablePurchase | null>(null)
  const [manualReason, setManualReason] = useState('')
  const [manualLoading, setManualLoading] = useState(false)

  const manualFiltered = useMemo(() => {
    const q = manualSearch.trim().toLowerCase()
    if (!q) return refundable
    return refundable.filter((p) =>
      [p.customer_name, p.title].join(' ').toLowerCase().includes(q),
    )
  }, [refundable, manualSearch])

  function closeManualModal() {
    setManualOpen(false)
    setManualSearch('')
    setManualSelected(null)
    setManualReason('')
  }

  async function handleManualRefund() {
    if (!manualSelected) { showError('Selecione uma compra.'); return }
    if (!manualReason.trim()) { showError('Informe o motivo do reembolso.'); return }
    setManualLoading(true)
    try {
      const result = await processManualRefund(manualSelected.id, manualSelected.kind, manualReason.trim())
      if (!result.success) { showError(result.error); return }
      showSuccess('Reembolso registrado com sucesso.')
      closeManualModal()
      router.refresh()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setManualLoading(false)
    }
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
            Reembolsos
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Processe e registre reembolsos de compras da escola.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="ghost" onClick={() => setManualOpen(true)}>
            <Banknote size={15} /> Reembolso manual
          </Button>
          <Button type="button" variant="primary" onClick={() => setMpOpen(true)}>
            <RefreshCcw size={15} /> Reembolso via Mercado Pago
          </Button>
        </div>
      </div>

      {/* History */}
      <section className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">
            Histórico de reembolsos
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">
            {refunded.length} reembolso{refunded.length !== 1 ? 's' : ''} registrado{refunded.length !== 1 ? 's' : ''}
          </p>
        </div>

        {refunded.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">
            Nenhum reembolso registrado ainda.
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3 whitespace-nowrap">Data</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                    <th className="px-4 py-3">Origem</th>
                    <th className="px-4 py-3">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {refunded.map((r) => (
                    <tr key={`${r.kind}:${r.id}`} className="align-middle hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${KIND_CLASS[r.kind]}`}>
                          {KIND_LABEL[r.kind]}
                        </span>
                      </td>
                      <td className="max-w-[180px] px-4 py-3">
                        <div className="truncate text-sm font-medium text-slate-800">{r.title}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">{r.customer_name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {new Date(r.updated_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span className="font-condensed text-base font-bold text-slate-500">
                          {formatPrice(r.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${r.origin === 'online' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                          {r.origin === 'online' ? 'Online' : 'Presencial'}
                        </span>
                      </td>
                      <td className="max-w-[240px] px-4 py-3">
                        <div className="truncate text-sm text-slate-500">
                          {r.refund_reason ?? <span className="text-slate-300">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="space-y-3 p-4 md:hidden">
              {refunded.map((r) => (
                <article key={`${r.kind}:${r.id}`} className="rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${KIND_CLASS[r.kind]}`}>
                          {KIND_LABEL[r.kind]}
                        </span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${r.origin === 'online' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                          {r.origin === 'online' ? 'Online' : 'Presencial'}
                        </span>
                      </div>
                      <div className="mt-1.5 font-semibold text-slate-800">{r.title}</div>
                      <div className="text-sm text-slate-600">{r.customer_name}</div>
                    </div>
                    <span className="shrink-0 font-condensed text-xl font-bold text-slate-500">
                      {formatPrice(r.amount)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Data</div>
                      <div>{new Date(r.updated_at).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Pagamento</div>
                      <div>{r.payment_method ?? '—'}</div>
                    </div>
                    {r.refund_reason && (
                      <div className="col-span-2">
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Motivo</div>
                        <div className="text-slate-500">{r.refund_reason}</div>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Modal: Reembolso via MP ───────────────────────────────────────────── */}
      {mpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded border border-slate-200 bg-slate-50 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
                  Reembolso via Mercado Pago
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Selecione a compra e informe sua chave de acesso MP.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeMpModal} aria-label="Fechar" disabled={mpLoading}>
                <X size={18} />
              </Button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Compra *
                </label>
                <Input
                  value={mpSearch}
                  onChange={(e) => setMpSearch(e.target.value)}
                  placeholder="Buscar por cliente ou título…"
                  icon={<Search size={14} />}
                  disabled={mpLoading}
                />
                <PurchaseList
                  items={mpFiltered}
                  selected={mpSelected}
                  onSelect={setMpSelected}
                  emptyMessage="Nenhuma compra online com pagamento MP encontrada."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Chave de acesso Mercado Pago *
                </label>
                <input
                  type="password"
                  value={mpToken}
                  onChange={(e) => setMpToken(e.target.value)}
                  disabled={mpLoading}
                  placeholder="APP_USR-…"
                  className="h-10 w-full rounded border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 disabled:opacity-50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Motivo do reembolso *
                </label>
                <textarea
                  value={mpReason}
                  onChange={(e) => setMpReason(e.target.value)}
                  rows={3}
                  disabled={mpLoading}
                  placeholder="Ex: cliente cancelou antes da aula."
                  className="w-full resize-none rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <Button type="button" variant="ghost" disabled={mpLoading} onClick={closeMpModal}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={mpLoading || !mpSelected}
                onClick={handleMpRefund}
              >
                {mpLoading ? 'Processando…' : 'Confirmar reembolso'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Reembolso Manual ───────────────────────────────────────────── */}
      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded border border-slate-200 bg-slate-50 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
                  Reembolso manual
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Registre um reembolso sem acionar a API do Mercado Pago.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeManualModal} aria-label="Fechar" disabled={manualLoading}>
                <X size={18} />
              </Button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Compra *
                </label>
                <Input
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  placeholder="Buscar por cliente ou título…"
                  icon={<Search size={14} />}
                  disabled={manualLoading}
                />
                <PurchaseList
                  items={manualFiltered}
                  selected={manualSelected}
                  onSelect={setManualSelected}
                  emptyMessage="Nenhuma compra paga encontrada."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Motivo do reembolso *
                </label>
                <textarea
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  rows={3}
                  disabled={manualLoading}
                  placeholder="Ex: cliente cancelou antes da aula."
                  className="w-full resize-none rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
              <Button type="button" variant="ghost" disabled={manualLoading} onClick={closeManualModal}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={manualLoading || !manualSelected}
                onClick={handleManualRefund}
              >
                {manualLoading ? 'Registrando…' : 'Confirmar reembolso'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
