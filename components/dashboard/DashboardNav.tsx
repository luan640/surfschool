'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, CalendarDays, ChevronDown, LayoutDashboard, LogOut, Package, Settings, TicketPercent, Users, Waves } from 'lucide-react'
import { signOut } from '@/actions/auth'
import { cn, initials } from '@/lib/utils'

interface NavChildItem {
  href: string
  label: string
}

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  children?: NavChildItem[]
}

interface NavSection {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Painel',
    items: [
      { href: '/dashboard/overview', label: 'Visao Geral', icon: LayoutDashboard },
      { href: '/dashboard/reports', label: 'Relatorios', icon: BarChart3 },
    ],
  },
  {
    label: 'Oferta',
    items: [
      { href: '/dashboard/packages', label: 'Pacotes', icon: Package },
      { href: '/dashboard/coupons', label: 'Cupons', icon: TicketPercent },
      { href: '/dashboard/trips', label: 'Trips', icon: Waves },
    ],
  },
  {
    label: 'Operacao',
    items: [
      { href: '/dashboard/instructors', label: 'Instrutores', icon: Users },
      { href: '/dashboard/students', label: 'Alunos', icon: Users },
      { href: '/dashboard/bookings', label: 'Agendamentos', icon: CalendarDays },
    ],
  },
  {
    label: 'Conta',
    items: [
      {
        href: '/dashboard/settings',
        label: 'Configuracoes',
        icon: Settings,
        children: [
          { href: '/dashboard/settings/payment-methods', label: 'Meio de pagamento' },
          { href: '/dashboard/settings/account-data', label: 'Dados da conta' },
          { href: '/dashboard/settings/rules', label: 'Regras' },
        ],
      },
    ],
  },
] as const

interface Props {
  schoolName: string
  schoolLogoUrl: string | null
  ownerName: string
}

export function DashboardNav({ schoolName, schoolLogoUrl, ownerName }: Props) {
  const pathname = usePathname()
  const settingsActive = pathname.startsWith('/dashboard/settings')
  const [settingsOpen, setSettingsOpen] = useState(settingsActive)

  const sections = useMemo(() => NAV_SECTIONS, [])

  return (
    <aside className="w-64 bg-[#0d1b2a] flex flex-col min-h-screen shrink-0 sticky top-0 h-screen">
      <div className="px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/10">
            {schoolLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={schoolLogoUrl} alt={`Logo da ${schoolName}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[var(--primary)]">
                <Waves size={18} className="text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500 uppercase tracking-[0.18em]">Escola</p>
            <p className="mt-1 truncate font-condensed text-lg font-bold uppercase tracking-wide text-white">
              {schoolName}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.label} className="mb-5">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {section.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map(({ href, label, icon: Icon, children }) => {
                const active = pathname.startsWith(href)

                if (children?.length) {
                  return (
                    <div key={href} className="rounded">
                      <button
                        type="button"
                        onClick={() => setSettingsOpen((value) => !value)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors',
                          active
                            ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white',
                        )}
                      >
                        <Icon size={16} className={active ? 'text-[var(--primary-light)]' : 'text-slate-500'} />
                        <span className="flex-1 text-left">{label}</span>
                        <ChevronDown
                          size={14}
                          className={cn(
                            'transition-transform',
                            settingsOpen ? 'rotate-180 text-white' : 'text-slate-500',
                          )}
                        />
                      </button>
                      {settingsOpen && (
                        <div className="mt-1 flex flex-col gap-1 pl-10">
                          {children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                'rounded px-3 py-2 text-sm transition-colors',
                                pathname === child.href
                                  ? 'bg-white/10 text-white'
                                  : 'text-slate-400 hover:bg-white/5 hover:text-white',
                              )}
                            >
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <Icon size={16} className={active ? 'text-[var(--primary-light)]' : 'text-slate-500'} />
                    <span>{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/5 bg-black/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-condensed text-xs font-bold shrink-0">
            {initials(ownerName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{ownerName}</p>
            <p className="text-slate-400 text-[11px]">Proprietario</p>
          </div>
          <form action={signOut}>
            <button type="submit" className="text-slate-400 hover:text-white transition-colors p-1">
              <LogOut size={14} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
