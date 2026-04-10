import { getRefundablePurchases, getRecentRefunds } from '@/actions/refunds'
import { RefundsPageClient } from '@/components/dashboard/RefundsPageClient'

export default async function RefundsPage() {
  const [refundable, refunded] = await Promise.all([
    getRefundablePurchases(),
    getRecentRefunds(),
  ])

  return <RefundsPageClient refundable={refundable} refunded={refunded} />
}
