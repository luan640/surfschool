'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Calendar, Clock, ArrowLeft, ArrowRight, History, Loader2, Mail, Phone, UserRound } from 'lucide-react'
import { SurfLoading } from '@/components/dashboard/SurfLoading'
import type { Booking, StudentProfile } from '@/lib/types'
import { formatPrice, initials } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

type StudentTabKey = 'upcoming' | 'history' | 'profile'

export function StudentLessonsClient({
  school,
  bookings,
  profile,
  initialTab,
}: {
  school: { name: string; slug: string; tagline: string | null; logo_url: string | null }
  bookings: Booking[]
  profile: StudentProfile | null
  initialTab: StudentTabKey
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { t, dateLocale } = useLanguage()
  const [activeTab, setActiveTab] = useState<StudentTabKey>(initialTab)
  const [loadingTab, setLoadingTab] = useState<StudentTabKey | null>(null)
  const [navigatingBack, setNavigatingBack] = useState(false)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    setActiveTab(initialTab)
    setLoadingTab(null)
  }, [initialTab])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    }
  }, [])

  const today = useMemo(() => {
    const current = new Date()
    current.setHours(0, 0, 0, 0)
    return current
  }, [])

  const upcoming = useMemo(() => (
    bookings.filter((booking) => {
      const lessonDate = new Date(`${booking.lesson_date}T00:00:00`)
      return lessonDate >= today && booking.status !== 'cancelled' && booking.status !== 'completed'
    })
  ), [bookings, today])

  const history = useMemo(() => (
    bookings.filter((booking) => {
      const lessonDate = new Date(`${booking.lesson_date}T00:00:00`)
      return lessonDate < today || booking.status === 'cancelled' || booking.status === 'completed'
    })
  ), [bookings, today])

  function handleTabChange(nextTab: StudentTabKey) {
    if (nextTab === activeTab || loadingTab) return

    setLoadingTab(nextTab)
    const nextUrl = `${pathname}?tab=${nextTab}`
    window.history.replaceState(null, '', nextUrl)

    timeoutRef.current = window.setTimeout(() => {
      setActiveTab(nextTab)
      setLoadingTab(null)
    }, 220)
  }

  const content = loadingTab ? (
    <section className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <SurfLoading
        compact
        fitParent
        title={t.lessons_loading_title}
        subtitle={t.lessons_loading_subtitle}
      />
    </section>
  ) : activeTab === 'upcoming' ? (
    <section className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900">{t.lessons_upcoming_title}</h1>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
            {t.lessons_upcoming_desc}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)]/8 px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)]">
          <Calendar size={12} />
          {t.lessons_upcoming_count(upcoming.length)}
        </div>
      </div>
      <div className="mt-4 space-y-3 transition-opacity duration-200">
        {upcoming.length === 0 ? (
          <EmptyLessonState label={t.lessons_upcoming_empty} />
        ) : (
          upcoming.map((booking) => (
            <LessonCard key={booking.id} booking={booking} statusLabel={{
              pending: t.lessons_status_pending,
              confirmed: t.lessons_status_confirmed,
              completed: t.lessons_status_completed,
              cancelled: t.lessons_status_cancelled,
            }} dateLocale={dateLocale} />
          ))
        )}
      </div>
    </section>
  ) : activeTab === 'history' ? (
    <section className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold text-slate-900">{t.lessons_history_title}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
            {t.lessons_history_desc}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
          <History size={12} />
          {t.lessons_history_count(history.length)}
        </div>
      </div>
      <div className="mt-4 space-y-3 transition-opacity duration-200">
        {history.length === 0 ? (
          <EmptyLessonState label={t.lessons_history_empty} />
        ) : (
          history.map((booking) => (
            <LessonCard key={booking.id} booking={booking} statusLabel={{
              pending: t.lessons_status_pending,
              confirmed: t.lessons_status_confirmed,
              completed: t.lessons_status_completed,
              cancelled: t.lessons_status_cancelled,
            }} dateLocale={dateLocale} />
          ))
        )}
      </div>
    </section>
  ) : (
    <section className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold text-slate-900">{t.lessons_profile_title}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
            {t.lessons_profile_desc}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
          <UserRound size={12} />
          {t.lessons_profile_badge}
        </div>
      </div>

      <div className="mt-4 space-y-3 transition-opacity duration-200">
        <ProfileItem label={t.lessons_field_name} value={profile?.full_name ?? t.lessons_not_informed} icon={<UserRound size={14} />} />
        <ProfileItem label={t.lessons_field_email} value={profile?.email ?? t.lessons_not_informed} icon={<Mail size={14} />} />
        <ProfileItem label={t.lessons_field_phone} value={profile?.phone ?? t.lessons_not_informed} icon={<Phone size={14} />} />
        <ProfileItem label={t.lessons_field_birth} value={profile?.birth_date ? new Date(`${profile.birth_date}T00:00:00`).toLocaleDateString(dateLocale) : t.lessons_not_informed_f} icon={<Calendar size={14} />} />
      </div>
    </section>
  )

  return (
    <div className="min-h-dvh bg-[#f4f5f7] pb-28 text-slate-900">
      <div className="mx-auto w-full max-w-md px-3 py-3 sm:max-w-2xl sm:px-5">
        <div className="mb-2 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => {
              if (navigatingBack) return
              setNavigatingBack(true)
              router.push(`/${school.slug}`)
            }}
            disabled={navigatingBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-[0_4px_12px_rgba(15,23,42,0.04)] disabled:opacity-60"
            aria-label="Voltar"
          >
            {navigatingBack ? <Loader2 size={16} className="animate-spin" /> : <ArrowLeft size={16} />}
          </button>
        </div>

        <header className="rounded-[20px] border border-slate-200 bg-white px-3 py-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-white">
              {school.logo_url ? (
                <Image src={school.logo_url} alt={school.name} fill className="object-cover" sizes="48px" />
              ) : (
                <span className="font-condensed text-base font-bold uppercase">{initials(school.name)}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold text-slate-900">{school.name}</div>
              <div className="mt-0.5 truncate text-[11px] text-slate-500">
                {school.tagline || t.lessons_tagline_default}
              </div>
            </div>
            <Link
              href={`/${school.slug}/agendar`}
              className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-3 text-[11px] font-semibold text-slate-600"
            >
              {t.lessons_book}
            </Link>
          </div>

          <div className="mt-4 flex items-center gap-5 overflow-x-auto border-b border-slate-100 pb-1">
            {[
              { label: t.lessons_tab_upcoming, key: 'upcoming' as const },
              { label: t.lessons_tab_history, key: 'history' as const },
              { label: t.lessons_tab_profile, key: 'profile' as const },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                disabled={Boolean(loadingTab)}
                className={`relative whitespace-nowrap pb-2 text-[14px] font-medium transition-all duration-200 ${
                  activeTab === tab.key ? 'text-[var(--primary)]' : 'text-slate-500'
                } ${loadingTab === tab.key ? 'scale-[0.98] opacity-70' : ''}`}
              >
                {tab.label}
                {activeTab === tab.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--primary)]" />}
              </button>
            ))}
          </div>
        </header>

        <main className="mt-3 space-y-3">
          {content}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/96 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex w-full max-w-md gap-3 sm:max-w-2xl">
          <Link
            href={`/${school.slug}/agendar`}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-[14px] bg-[var(--primary)] px-4 text-[16px] font-medium text-white shadow-[0_12px_28px_rgba(0,0,0,0.16)] transition-transform active:scale-[0.99]"
          >
            {t.lessons_book_now}
            <ArrowRight size={15} className="ml-2" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function LessonCard({ booking, statusLabel, dateLocale }: { booking: Booking; statusLabel: Record<string, string>; dateLocale: string }) {
  return (
    <article className="rounded-[14px] border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-slate-900">
            {booking.instructor?.full_name ?? 'Instructor'}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
            <Clock size={12} />
            <span className="truncate">
              {new Date(`${booking.lesson_date}T00:00:00`).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' })} - {booking.time_slots.join(', ')}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[14px] font-semibold text-slate-900">
            {formatPrice(booking.total_amount)}
          </div>
          <div className="mt-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {statusLabel[booking.status] ?? booking.status}
          </div>
        </div>
      </div>
    </article>
  )
}

function EmptyLessonState({ label }: { label: string }) {
  return (
    <div className="rounded-[16px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-[14px] text-slate-500">
      {label}
    </div>
  )
}

function ProfileItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-1.5 text-[15px] font-medium text-slate-800">{value}</div>
    </div>
  )
}
