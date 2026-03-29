import { getSalesHistoryPageData } from '@/actions/sales-history'
import { SalesHistoryPageClient } from '@/components/dashboard/SalesHistoryPageClient'

export default async function SalesHistoryPage() {
  const { sales } = await getSalesHistoryPageData()

  return <SalesHistoryPageClient sales={sales} />
}
