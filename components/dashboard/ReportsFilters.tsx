'use client'

import { useEffect, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

interface Option {
  id: string
  label: string
  inactive?: boolean
}

interface Props {
  instructors: Option[]
  coupons: Option[]
  onPendingChange?: (pending: boolean) => void
}

export function ReportsFilters({ instructors, coupons, onPendingChange }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    onPendingChange?.(isPending)
  }, [isPending, onPendingChange])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const nextParams = new URLSearchParams()

    for (const [key, value] of formData.entries()) {
      const normalizedValue = String(value).trim()
      if (normalizedValue) nextParams.set(key, normalizedValue)
    }

    const query = nextParams.toString()

    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  function handleClear() {
    startTransition(() => {
      router.replace(pathname, { scroll: false })
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 rounded border border-slate-200 bg-white p-5 md:grid-cols-2 xl:grid-cols-6">
      <FilterField label="Data inicial">
        <input
          name="from"
          type="date"
          defaultValue={searchParams.get('from') ?? ''}
          className="h-11 w-full rounded border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
        />
      </FilterField>

      <FilterField label="Data final">
        <input
          name="to"
          type="date"
          defaultValue={searchParams.get('to') ?? ''}
          className="h-11 w-full rounded border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
        />
      </FilterField>

      <FilterField label="Instrutor">
        <select
          name="instructorId"
          defaultValue={searchParams.get('instructorId') ?? ''}
          className="h-11 w-full rounded border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
        >
          <option value="">Todos</option>
          {instructors.map((instructor) => (
            <option key={instructor.id} value={instructor.id}>
              {instructor.label}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Cupom">
        <select
          name="couponId"
          defaultValue={searchParams.get('couponId') ?? ''}
          className="h-11 w-full rounded border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
        >
          <option value="">Todos</option>
          {coupons.map((coupon) => (
            <option key={coupon.id} value={coupon.id}>
              {coupon.label}{coupon.inactive ? ' (inativo)' : ''}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Origem do pagamento">
        <select
          name="paymentOrigin"
          defaultValue={searchParams.get('paymentOrigin') ?? ''}
          className="h-11 w-full rounded border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
        >
          <option value="">Todos</option>
          <option value="online">Online</option>
          <option value="presential">Presencial</option>
        </select>
      </FilterField>

      <div className="flex items-end gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 flex-1 items-center justify-center rounded bg-slate-900 px-4 text-sm font-bold uppercase text-white disabled:opacity-60"
        >
          {isPending ? 'Atualizando...' : 'Aplicar filtros'}
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center rounded border border-slate-200 px-4 text-sm font-bold uppercase text-slate-600 disabled:opacity-60"
        >
          Limpar
        </button>
      </div>
    </form>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  )
}
