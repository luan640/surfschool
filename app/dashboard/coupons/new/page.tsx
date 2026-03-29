import { getCouponEligiblePackages } from '@/actions/coupons'
import { CouponForm } from '@/components/dashboard/CouponForm'

export default async function NewCouponPage() {
  const packages = await getCouponEligiblePackages()

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Novo cupom
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Defina desconto, vigencia e limites de uso para a campanha.
        </p>
      </div>
      <CouponForm packages={packages} />
    </div>
  )
}
