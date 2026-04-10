'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toaster'
import { createDiscountCoupon, deleteDiscountCoupon, updateDiscountCoupon } from '@/actions/coupons'
import type { DiscountCoupon, LessonPackage } from '@/lib/types'
import { DollarSign, Percent, Tag, CalendarClock, FileText, Trash2, Hash, Package, Clock3 } from 'lucide-react'

interface Props {
  coupon?: DiscountCoupon
  packages: Pick<LessonPackage, 'id' | 'name' | 'active'>[]
}

export function CouponForm({ coupon, packages }: Props) {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const [active, setActive] = useState(coupon?.active ?? true)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(coupon?.discount_type ?? 'percentage')
  const [appliesToSingleLesson, setAppliesToSingleLesson] = useState(coupon?.applies_to_single_lesson ?? false)
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>(coupon?.packages?.map((item) => item.id) ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    formData.set('active', String(active))
    formData.set('discount_type', discountType)
    formData.set('applies_to_single_lesson', String(appliesToSingleLesson))
    formData.delete('package_ids')
    selectedPackageIds.forEach((id) => formData.append('package_ids', id))

    const result = coupon
      ? await updateDiscountCoupon(coupon.id, formData)
      : await createDiscountCoupon(formData)

    if (!result.success) {
      setError(result.error)
      showError(coupon ? 'Não foi possível salvar o cupom.' : 'Não foi possível criar o cupom.', result.error)
      setLoading(false)
      return
    }

    success(coupon ? 'Cupom atualizado com sucesso.' : 'Cupom criado com sucesso.')
    router.push('/dashboard/coupons')
    router.refresh()
  }

  async function handleDelete() {
    if (!coupon) return
    if (!window.confirm('Excluir este cupom?')) return

    setLoading(true)
    setError('')
    const result = await deleteDiscountCoupon(coupon.id)

    if (!result.success) {
      setError(result.error)
      showError('Não foi possível excluir o cupom.', result.error)
      setLoading(false)
      return
    }

    success('Cupom excluido com sucesso.')
    router.push('/dashboard/coupons')
    router.refresh()
  }

  function togglePackage(id: string) {
    setSelectedPackageIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
  }

  return (
    <form onSubmit={handleSubmit} className="dashboard-form-wide space-y-8">
      <div className="rounded border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Dados do cupom</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Codigo *</label>
            <Input
              name="code"
              required
              defaultValue={coupon?.code ?? ''}
              placeholder="SURF10"
              icon={<Hash size={14} />}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Nome interno *</label>
            <Input
              name="name"
              required
              defaultValue={coupon?.name ?? ''}
              placeholder="Cupom de boas-vindas"
              icon={<Tag size={14} />}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Tipo de desconto *</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDiscountType('percentage')}
                className={`h-11 rounded border px-3 text-sm font-semibold ${discountType === 'percentage' ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-slate-900' : 'border-slate-200 text-slate-500'}`}
              >
                <Percent size={14} className="mr-2 inline" />
                Percentual
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('fixed')}
                className={`h-11 rounded border px-3 text-sm font-semibold ${discountType === 'fixed' ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-slate-900' : 'border-slate-200 text-slate-500'}`}
              >
                <DollarSign size={14} className="mr-2 inline" />
                Valor fixo
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Valor do desconto *</label>
            <Input
              name="discount_value"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={coupon?.discount_value ?? ''}
              placeholder={discountType === 'percentage' ? '10' : '50.00'}
              icon={discountType === 'percentage' ? <Percent size={14} /> : <DollarSign size={14} />}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Pedido minimo</label>
            <Input
              name="min_order_amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={coupon?.min_order_amount ?? ''}
              placeholder="100.00"
              icon={<DollarSign size={14} />}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
            <button
              type="button"
              onClick={() => setActive((value) => !value)}
              className="h-11 rounded-sm border border-slate-200 px-3 text-left text-sm text-slate-800 bg-white hover:border-[var(--primary)] transition-colors"
            >
              {active ? 'Ativo' : 'Inativo'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Descricao</label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-400 pointer-events-none">
              <FileText size={14} />
            </span>
            <textarea
              name="description"
              rows={4}
              defaultValue={coupon?.description ?? ''}
              placeholder="Explique quando esse cupom deve ser usado e qual a campanha."
              className="w-full resize-none rounded-sm border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-800 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
            />
          </div>
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Regras de uso</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Limite total de uso</label>
            <Input
              name="usage_limit_total"
              type="number"
              min="1"
              defaultValue={coupon?.usage_limit_total ?? ''}
              placeholder="100"
              icon={<Tag size={14} />}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Limite por usuario</label>
            <Input
              name="usage_limit_per_user"
              type="number"
              min="1"
              defaultValue={coupon?.usage_limit_per_user ?? ''}
              placeholder="1"
              icon={<Tag size={14} />}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Inicio da vigencia</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400 pointer-events-none">
                <CalendarClock size={14} />
              </span>
              <input
                name="starts_at"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(coupon?.starts_at ?? null)}
                className="h-11 w-full rounded-sm border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Fim da vigencia</label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-slate-400 pointer-events-none">
                <CalendarClock size={14} />
              </span>
              <input
                name="ends_at"
                type="datetime-local"
                defaultValue={toDateTimeLocalValue(coupon?.ends_at ?? null)}
                className="h-11 w-full rounded-sm border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
              />
            </div>
          </div>
        </div>

        {coupon && (
          <div className="flex flex-wrap items-center gap-3 rounded border border-slate-200 bg-slate-50 p-4">
            <Badge variant={active ? 'success' : 'neutral'}>{active ? 'Ativo' : 'Inativo'}</Badge>
            <span className="text-sm text-slate-600">
              {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% off` : `R$ ${Number(coupon.discount_value).toFixed(2).replace('.', ',')} off`}
            </span>
            <span className="text-sm text-slate-400">
              Limite total: {coupon.usage_limit_total ?? 'Ilimitado'}
            </span>
            <span className="text-sm text-slate-400">
              Por usuario: {coupon.usage_limit_per_user ?? 'Ilimitado'}
            </span>
          </div>
        )}
      </div>

      <div className="rounded border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Servicos elegiveis</h2>
            <p className="mt-1 text-sm text-slate-400">Defina para quais servicos este cupom pode ser aplicado.</p>
          </div>
          <Badge variant="dark">
            {(appliesToSingleLesson ? 1 : 0) + selectedPackageIds.length} selecionado{(appliesToSingleLesson ? 1 : 0) + selectedPackageIds.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setAppliesToSingleLesson((value) => !value)}
            className={`rounded border p-4 text-left transition-colors ${appliesToSingleLesson ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-slate-200 bg-white hover:border-[var(--primary)]/40'}`}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-slate-100 p-2 text-slate-600">
                <Clock3 size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800">Aula avulsa</p>
                  {appliesToSingleLesson && <Badge variant="default">Selecionado</Badge>}
                </div>
                <p className="mt-1 text-sm text-slate-500">O cupom pode ser usado no agendamento individual.</p>
              </div>
            </div>
          </button>

          {packages.map((pkg) => {
            const selected = selectedPackageIds.includes(pkg.id)
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => togglePackage(pkg.id)}
                className={`rounded border p-4 text-left transition-colors ${selected ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-slate-200 bg-white hover:border-[var(--primary)]/40'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-slate-100 p-2 text-slate-600">
                    <Package size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-slate-800">{pkg.name}</p>
                      {selected && <Badge variant="default">Selecionado</Badge>}
                      {!pkg.active && <Badge variant="neutral">Inativo</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">Cupom valido para este pacote.</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-500">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Salvando...' : coupon ? 'Salvar alterações' : 'Criar cupom'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/coupons')} disabled={loading}>
          Cancelar
        </Button>
        {coupon && (
          <Button type="button" variant="danger" onClick={handleDelete} disabled={loading}>
            <Trash2 size={14} /> Excluir
          </Button>
        )}
      </div>
    </form>
  )
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}
