import { getPurchases } from '@/actions/purchases'
import { PurchasesPageClient } from '@/components/dashboard/PurchasesPageClient'
import type { PurchaseKind } from '@/actions/purchases'

interface Props {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function PurchasesPage({ searchParams }: Props) {
  const params = await searchParams

  const str = (key: string) => {
    const v = params?.[key]
    return typeof v === 'string' && v.trim() ? v.trim() : undefined
  }

  const kind = str('kind') as PurchaseKind | undefined
  const origin = str('origin') as 'online' | 'presencial' | undefined
  const from   = str('from')
  const to     = str('to')
  const query  = str('q')
  const page   = Number(str('page') ?? '1') || 1

  const result = await getPurchases({ kind, origin, from, to, query, page })

  return (
    <PurchasesPageClient
      purchases={result.purchases}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      filters={{ kind: kind ?? '', origin: origin ?? '', from: from ?? '', to: to ?? '', query: query ?? '' }}
    />
  )
}
