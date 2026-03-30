import { Suspense } from 'react'
import { getReportFilterOptions } from '@/actions/reports'
import { ReportsLoadingSection } from '@/components/dashboard/ReportsLoadingSection'
import { ReportsPageClient } from '@/components/dashboard/ReportsPageClient'
import { ReportsResults } from '@/app/dashboard/reports/ReportsResults'

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReportsPage({ searchParams }: Props) {
  const params = await searchParams
  const rawFrom = typeof params?.from === 'string' ? params.from : undefined
  const rawTo = typeof params?.to === 'string' ? params.to : undefined
  const rawInstructorId = typeof params?.instructorId === 'string' ? params.instructorId : undefined
  const rawCouponId = typeof params?.couponId === 'string' ? params.couponId : undefined
  const rawPaymentOrigin = typeof params?.paymentOrigin === 'string' ? params.paymentOrigin : undefined

  const filtersOptions = await getReportFilterOptions()
  const suspenseKey = `${rawFrom ?? ''}:${rawTo ?? ''}:${rawInstructorId ?? ''}:${rawCouponId ?? ''}:${rawPaymentOrigin ?? ''}`

  return (
    <div className="dashboard-page">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Relatórios
        </h1>
      </div>

      <ReportsPageClient
        instructors={filtersOptions.instructors.map((item) => ({ id: item.id, label: item.full_name }))}
        coupons={filtersOptions.coupons.map((item) => ({ id: item.id, label: `${item.code} - ${item.name}`, inactive: !item.active }))}
      >
        <Suspense key={suspenseKey} fallback={<ReportsLoadingSection />}>
          <ReportsResults
            from={rawFrom}
            to={rawTo}
            instructorId={rawInstructorId}
            couponId={rawCouponId}
            paymentOrigin={rawPaymentOrigin}
          />
        </Suspense>
      </ReportsPageClient>
    </div>
  )
}
