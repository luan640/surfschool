'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  Package,
  ReceiptText,
  Settings,
  TicketPercent,
  Users,
  Waves,
} from 'lucide-react'
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
    label: 'Financeiro',
    items: [
      { href: '/dashboard/settings/payment-methods', label: 'Meio de pagamento', icon: CreditCard },
      { href: '/dashboard/sales-history', label: 'Histórico de vendas', icon: ReceiptText },
      { href: '/dashboard/commission-payments', label: 'Pagamento de comissão', icon: CircleDollarSign },
    ],
  },
  {
    label: 'Conta',
    items: [
      {
        href: '/dashboard/settings',
        label: 'Configurações',
        icon: Settings,
        children: [
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
  mobile?: boolean
  onNavigate?: () => void
}

export function DashboardNav({ schoolName, schoolLogoUrl, ownerName, mobile = false, onNavigate }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    '/dashboard/settings': pathname.startsWith('/dashboard/settings') && pathname !== '/dashboard/settings/payment-methods',
  })

  const sections = useMemo(() => NAV_SECTIONS, [])

  useEffect(() => {
    if (mobile) {
      setCollapsed(false)
    }
  }, [mobile])

  useEffect(() => {
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        router.prefetch(item.href)
        for (const child of item.children ?? []) {
          router.prefetch(child.href)
        }
      }
    }
  }, [router])

  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col bg-[#0d1b2a] transition-[width] duration-200',
        mobile
          ? 'h-full min-h-full w-full max-w-none'
          : cn('sticky top-0 h-screen min-h-screen', collapsed ? 'w-20' : 'w-64'),
      )}
    >
      <div className={cn('border-b border-white/5', collapsed ? 'px-3 py-5' : 'px-6 py-5')}>
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
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

          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Escola</p>
              <p className="mt-1 truncate font-condensed text-lg font-bold uppercase tracking-wide text-white">
                {schoolName}
              </p>
            </div>
          )}
        </div>

        {mobile ? (
          <div className="mt-4 flex h-9 items-center justify-between rounded border border-white/10 bg-white/5 px-3 text-slate-300">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em]">Menu</span>
            <button type="button" onClick={onNavigate} aria-label="Fechar menu mobile">
              <PanelLeftClose size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className={cn(
              'mt-4 flex h-9 items-center rounded border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white',
              collapsed ? 'w-full justify-center' : 'w-full justify-between px-3',
            )}
            title={collapsed ? 'Expandir menu' : 'Fechar menu'}
          >
            {!collapsed && <span className="text-[11px] font-bold uppercase tracking-[0.18em]">Menu</span>}
            <ChevronLeft size={16} className={cn('transition-transform', collapsed && 'rotate-180')} />
          </button>
        )}
      </div>

      <nav className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
        {sections.map((section) => (
          <div key={section.label} className="mb-5">
            {!collapsed && (
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {section.label}
              </div>
            )}

            <div className="flex flex-col gap-0.5">
              {section.items.map(({ href, label, icon: Icon, children }) => {
                const childMatch = children?.some((child) => pathname === child.href) ?? false
                const baseActive = pathname.startsWith(href)
                const active = href === '/dashboard/settings'
                  ? childMatch || (baseActive && pathname !== '/dashboard/settings/payment-methods')
                  : baseActive || childMatch
                const groupOpen = openGroups[href] ?? false

                if (children?.length) {
                  return (
                    <div key={href} className="rounded">
                      <button
                        type="button"
                        onClick={() => {
                          if (collapsed) {
                            setCollapsed(false)
                            setOpenGroups((current) => ({ ...current, [href]: true }))
                            return
                          }

                          setOpenGroups((current) => ({ ...current, [href]: !groupOpen }))
                        }}
                        title={label}
                        className={cn(
                          'flex w-full items-center rounded text-sm font-medium transition-colors',
                          collapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2.5',
                          active
                            ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white',
                        )}
                      >
                        <Icon size={16} className={active ? 'text-[var(--primary-light)]' : 'text-slate-500'} />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">{label}</span>
                            <ChevronDown
                              size={14}
                              className={cn(
                                'transition-transform',
                                groupOpen ? 'rotate-180 text-white' : 'text-slate-500',
                              )}
                            />
                          </>
                        )}
                      </button>

                      {!collapsed && groupOpen && (
                        <div className="mt-1 flex flex-col gap-1 pl-10">
                          {children.map((child) => (
                            <Link
                              key={child.href}
                              href={child.href}
                              prefetch
                              onClick={onNavigate}
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
                    prefetch
                    title={label}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center rounded text-sm font-medium transition-colors',
                      collapsed ? 'justify-center px-3 py-3' : 'gap-3 px-3 py-2.5',
                      active
                        ? 'bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white',
                    )}
                  >
                    <Icon size={16} className={active ? 'text-[var(--primary-light)]' : 'text-slate-500'} />
                    {!collapsed && <span>{label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn('border-t border-white/5 bg-black/10 py-4', collapsed ? 'px-2' : 'px-4')}>
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] font-condensed text-xs font-bold text-white">
            {initials(ownerName)}
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{ownerName}</p>
              <p className="text-[11px] text-slate-400">Proprietario</p>
            </div>
          )}

          <form action={signOut}>
            <button
              type="submit"
              title="Sair"
              className={cn(
                'text-slate-400 transition-colors hover:text-white',
                collapsed ? 'p-2' : 'p-1',
              )}
            >
              <LogOut size={14} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
