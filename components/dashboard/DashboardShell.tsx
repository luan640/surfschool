'use client'

import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { DashboardNav } from '@/components/dashboard/DashboardNav'

interface Props {
  schoolName: string
  schoolLogoUrl: string | null
  ownerName: string
  children: React.ReactNode
  primaryColor: string
  ctaColor: string
}

export function DashboardShell({
  schoolName,
  schoolLogoUrl,
  ownerName,
  children,
  primaryColor,
  ctaColor,
}: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <div
      className="min-h-screen md:flex"
      style={{ '--primary': primaryColor, '--cta': ctaColor } as React.CSSProperties}
    >
      <div className="hidden md:block">
        <DashboardNav schoolName={schoolName} schoolLogoUrl={schoolLogoUrl} ownerName={ownerName} />
      </div>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Painel</p>
            <p className="truncate font-condensed text-lg font-bold uppercase tracking-wide text-slate-800">
              {schoolName}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Abrir menu do dashboard">
            <Menu size={18} />
          </Button>
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/45 md:hidden">
            <div className="absolute inset-y-0 left-0 w-[86vw] max-w-xs">
              <DashboardNav
                schoolName={schoolName}
                schoolLogoUrl={schoolLogoUrl}
                ownerName={ownerName}
                mobile
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
            <button
              type="button"
              aria-label="Fechar menu do dashboard"
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-sm"
              onClick={() => setMobileOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-slate-50">{children}</main>
      </div>
    </div>
  )
}
