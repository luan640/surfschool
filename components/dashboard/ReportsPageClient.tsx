'use client'

import { useState } from 'react'
import { ReportsFilters } from '@/components/dashboard/ReportsFilters'
import { ReportsLoadingSection } from '@/components/dashboard/ReportsLoadingSection'

interface Option {
  id: string
  label: string
  inactive?: boolean
}

interface Props {
  instructors: Option[]
  coupons: Option[]
  children: React.ReactNode
}

export function ReportsPageClient({ instructors, coupons, children }: Props) {
  const [isPending, setIsPending] = useState(false)

  return (
    <>
      <div className="mb-6">
        <ReportsFilters
          instructors={instructors}
          coupons={coupons}
          onPendingChange={setIsPending}
        />
      </div>

      <div className="relative min-h-[420px]">
        <div className={`transition-opacity duration-200 ${isPending ? 'opacity-35' : 'opacity-100'}`}>
          {children}
        </div>

        {isPending && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <ReportsLoadingSection overlay />
          </div>
        )}
      </div>
    </>
  )
}
