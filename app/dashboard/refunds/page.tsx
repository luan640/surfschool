import { getRefundablePurchases, getRecentRefunds } from '@/actions/refunds'
import { RefundsPageClient } from '@/components/dashboard/RefundsPageClient'

export const dynamic = 'force-dynamic'

export default async function RefundsPage() {
  const [refundable, refunded] = await Promise.all([
    getRefundablePurchases(),
    getRecentRefunds(),
  ])

  return <RefundsPageClient refundable={refundable} refunded={refunded} />
}
