'use client'

import { useSearchParams } from 'next/navigation'

interface Option {
  id: string
  label: string
  inactive?: boolean
}

interface Props {
  instructors: Option[]
  coupons: Option[]
}

export function ReportsFilters({ instructors, coupons }: Props) {
  const searchParams = useSearchParams()

  return (
    <form method="get" className="grid grid-cols-1 gap-4 rounded border border-slate-200 bg-white p-5 md:grid-cols-2 xl:grid-cols-5">
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

      <div className="flex items-end gap-3">
        <button type="submit" className="inline-flex h-11 flex-1 items-center justify-center rounded bg-slate-900 px-4 text-sm font-bold uppercase text-white">
          Aplicar filtros
        </button>
        <a href="/dashboard/reports" className="inline-flex h-11 items-center justify-center rounded border border-slate-200 px-4 text-sm font-bold uppercase text-slate-600">
          Limpar
        </a>
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
