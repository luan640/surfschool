import { getCommissionPaymentPageData } from '@/actions/commission-payments'
import { CommissionPaymentForm } from '@/components/dashboard/CommissionPaymentForm'

export default async function CommissionPaymentsPage() {
  const { instructors, payments } = await getCommissionPaymentPageData()

  return <CommissionPaymentForm instructors={instructors} payments={payments} />
}
