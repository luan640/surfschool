import { redirect } from 'next/navigation'
import { getCouponEligiblePackages, getDiscountCouponById } from '@/actions/coupons'
import { CouponForm } from '@/components/dashboard/CouponForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditCouponPage({ params }: Props) {
  const { id } = await params
  const [coupon, packages] = await Promise.all([
    getDiscountCouponById(id),
    getCouponEligiblePackages(),
  ])

  if (!coupon) redirect('/dashboard/coupons')

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Editar cupom
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Atualize regras, vigencia e limites de uso do cupom.
        </p>
      </div>
      <CouponForm coupon={coupon} packages={packages} />
    </div>
  )
}
