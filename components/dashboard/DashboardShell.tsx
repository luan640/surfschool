'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Crown, Menu, ShieldAlert, X } from 'lucide-react'
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
  isExpired?: boolean
  accessLimitDate?: string | null
}

const PLAN_PATHS = '/dashboard/settings/plan'

export function DashboardShell({
  schoolName,
  schoolLogoUrl,
  ownerName,
  children,
  primaryColor,
  ctaColor,
  isExpired = false,
  accessLimitDate,
}: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const showExpiredOverlay = isExpired && !pathname.startsWith(PLAN_PATHS)

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

        <main className="flex-1 overflow-y-auto bg-slate-50">
          {showExpiredOverlay ? (
            <div className="flex min-h-full flex-col items-center justify-center px-4 py-20">
              <div className="w-full max-w-md rounded-lg border border-rose-200 bg-white p-8 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100">
                    <ShieldAlert size={20} className="text-rose-600" />
                  </div>
                  <div>
                    <h1 className="font-condensed text-xl font-bold uppercase tracking-wide text-slate-800">
                      Período gratuito encerrado
                    </h1>
                    {accessLimitDate && (
                      <p className="text-sm text-slate-500">Seu acesso expirou em {accessLimitDate}</p>
                    )}
                  </div>
                </div>

                <p className="mb-6 text-sm text-slate-600">
                  Para continuar usando a plataforma, assine o VSPro e tenha acesso ilimitado a todos os recursos.
                </p>

                <ul className="mb-6 space-y-2 text-sm text-slate-600">
                  {[
                    'Alunos, instrutores e agendamentos ilimitados',
                    'Integração completa com Mercado Pago',
                    'Gestão de pacotes, trips e cupons',
                    'Relatórios e histórico financeiro',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Crown size={13} className="shrink-0 text-amber-500" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/dashboard/settings/plan/upgrade"
                  className="flex w-full items-center justify-center gap-2 rounded bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                >
                  <Crown size={14} />
                  Assinar VSPro
                </Link>
                <Link
                  href="/dashboard/settings/plan"
                  className="mt-3 flex w-full items-center justify-center rounded border border-slate-200 px-4 py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-50"
                >
                  Ver detalhes do plano
                </Link>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
