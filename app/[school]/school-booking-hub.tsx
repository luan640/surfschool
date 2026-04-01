'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, Clock3, MapPin, Search, ShieldCheck, UserRound, Waves, X } from 'lucide-react'
import type { Instructor, LessonPackage } from '@/lib/types'
import { formatPrice, initials, WEEKDAYS_PT } from '@/lib/utils'

type SchoolPublicData = {
  slug: string
  name: string
  tagline: string | null
  address: string | null
  phone: string | null
  logo_url: string | null
}

type TabKey = 'details' | 'services' | 'pros'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'details', label: 'Detalhes' },
  { key: 'services', label: 'Serviços' },
  { key: 'pros', label: 'Profissionais' },
]

export function SchoolBookingHub({
  school,
  instructors,
  packages,
  initialTab = 'details',
}: {
  school: SchoolPublicData
  instructors: Instructor[]
  packages: LessonPackage[]
  initialTab?: TabKey
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [serviceQuery, setServiceQuery] = useState('')
  const [proQuery, setProQuery] = useState('')
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null)

  const singleLessonPrice = useMemo(() => {
    if (instructors.length === 0) return null
    return Math.min(...instructors.map((item) => item.hourly_price))
  }, [instructors])

  const filteredPackages = useMemo(() => {
    const query = serviceQuery.trim().toLowerCase()
    const serviceCards = [
      ...(singleLessonPrice !== null
        ? [{
            id: 'single-lesson',
            name: 'Aula avulsa',
            description: 'Escolha data, horario e instrutor para reservar uma aula individual.',
            price: singleLessonPrice,
            duration: 'Reserva flexivel',
          }]
        : []),
      ...packages.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || `${item.lesson_count} aulas no pacote`,
        price: Number(item.price),
        duration: `${item.lesson_count} aulas`,
      })),
    ]

    if (!query) return serviceCards
    return serviceCards.filter((item) =>
      item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query),
    )
  }, [packages, serviceQuery, singleLessonPrice])

  const filteredInstructors = useMemo(() => {
    const query = proQuery.trim().toLowerCase()
    if (!query) return instructors
    return instructors.filter((item) =>
      item.full_name.toLowerCase().includes(query) || (item.specialty || '').toLowerCase().includes(query),
    )
  }, [instructors, proQuery])

  const availabilitySummary = useMemo(() => {
    const grouped = new Map<number, string[]>()

    instructors.forEach((instructor) => {
      instructor.availability?.forEach((slot) => {
        const current = grouped.get(slot.weekday) ?? []
        grouped.set(slot.weekday, [...current, ...slot.time_slots])
      })
    })

    return Array.from({ length: 7 }, (_, weekday) => {
      const slots = Array.from(new Set(grouped.get(weekday) ?? [])).sort()
      if (slots.length === 0) {
        return { weekday, label: WEEKDAYS_PT[weekday], text: 'Sem agenda publicada' }
      }

      const first = slots[0]
      const last = slots[slots.length - 1]
      return { weekday, label: WEEKDAYS_PT[weekday], text: `${first} - ${last}` }
    })
  }, [instructors])

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  return (
    <div className="min-h-dvh bg-[#f4f5f7] pb-28 text-slate-900">
      <div className="mx-auto w-full max-w-md px-3 py-3 sm:max-w-2xl sm:px-5">
        <div className="mb-2 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-[0_4px_12px_rgba(15,23,42,0.04)]"
            aria-label="Voltar"
          >
            <ArrowLeft size={16} />
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
                {school.tagline || 'Reserve sua aula online em poucos passos.'}
              </div>
            </div>
            <Link
              href={`/${school.slug}/entrar?mode=login&next=minhas-aulas`}
              className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-3 text-[11px] font-semibold text-slate-600"
            >
              Entrar
            </Link>
          </div>

          <div className="mt-4 flex items-center gap-5 overflow-x-auto border-b border-slate-100 pb-1">
            {TABS.map((tab) => {
              const active = tab.key === activeTab
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative whitespace-nowrap pb-2 text-[14px] font-medium transition-colors ${
                    active ? 'text-[var(--primary)]' : 'text-slate-500'
                  }`}
                >
                  {tab.label}
                  {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--primary)]" />}
                </button>
              )
            })}
          </div>
        </header>

        <main className="mt-3">
          {activeTab === 'details' && (
            <section className="space-y-3">
              <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <div
                  className="flex min-h-[180px] items-end bg-[radial-gradient(circle_at_top,#1f3f63,transparent_55%),linear-gradient(135deg,#06080d,#121826)] px-4 py-4"
                >
                  <div className="max-w-[220px]">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_8px_20px_rgba(15,23,42,0.18)]">
                      <ShieldCheck size={13} />
                      Reserva online
                    </div>
                    <h1 className="mt-3 text-[26px] font-semibold leading-[1.02] text-white">{school.name}</h1>
                    <p className="mt-2 text-[13px] leading-relaxed text-white/70">
                      {school.tagline || 'Escolha seu servico, profissional e horario direto pelo celular.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <h2 className="text-[17px] font-semibold text-slate-900">Contato</h2>
                <div className="mt-3 space-y-3 text-[14px] text-slate-600">
                  {school.phone && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-slate-100 p-2 text-slate-500">
                        <UserRound size={14} />
                      </div>
                      <div>{school.phone}</div>
                    </div>
                  )}
                  {school.address && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-slate-100 p-2 text-slate-500">
                        <MapPin size={14} />
                      </div>
                      <div>{school.address}</div>
                    </div>
                  )}
                  {!school.phone && !school.address && (
                    <p className="text-[14px] text-slate-500">As informações de contato ainda não foram publicadas.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-[17px] font-semibold text-slate-900">Disponibilidade</h2>
                  <div className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)]/8 px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)]">
                    <CalendarDays size={12} />
                    {instructors.length} profissionais
                  </div>
                </div>
                <div className="mt-3 divide-y divide-slate-100">
                  {availabilitySummary.map((item) => (
                    <div key={item.weekday} className="flex items-start justify-between gap-4 py-3 text-[13px]">
                      <div className="font-medium text-slate-500">{item.label}</div>
                      <div className="text-right font-semibold text-slate-700">{item.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'services' && (
            <section className="space-y-3">
              <SearchField
                value={serviceQuery}
                onChange={setServiceQuery}
                placeholder="Procurar servico"
              />
              <div className="space-y-3">
                {filteredPackages.length === 0 ? (
                  <EmptyState label="Nenhum servico encontrado." />
                ) : (
                  filteredPackages.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-[16px] border border-slate-200 bg-white px-3 py-3 shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[14px] bg-slate-100 text-slate-400">
                        <Waves size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[16px] font-medium text-slate-900">{item.name}</div>
                        <div className="mt-1 inline-flex items-center gap-1 text-[12px] text-slate-500">
                          <Clock3 size={12} />
                          {item.duration}
                        </div>
                        <div className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-500">{item.description}</div>
                        <div className="mt-2 text-[15px] font-semibold text-[var(--primary)]">{formatPrice(item.price)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {activeTab === 'pros' && (
            <section className="space-y-3">
              <SearchField
                value={proQuery}
                onChange={setProQuery}
                placeholder="Procurar profissional"
              />
              <div className="space-y-3">
                {filteredInstructors.length === 0 ? (
                  <EmptyState label="Nenhum profissional encontrado." />
                ) : (
                  filteredInstructors.map((instructor) => (
                    <div
                      key={instructor.id}
                      className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white px-3 py-2 shadow-[0_6px_18px_rgba(15,23,42,0.04)]"
                    >
                      <button
                        type="button"
                        className="relative flex h-[48px] w-[48px] shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-slate-200 text-white"
                        onClick={() => {
                          if (instructor.photo_url) {
                            setPreviewImage({ src: instructor.photo_url, alt: instructor.full_name })
                          }
                        }}
                      >
                        {instructor.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={instructor.photo_url} alt={instructor.full_name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-bold" style={{ background: instructor.color }}>
                            {initials(instructor.full_name)}
                          </div>
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-medium leading-tight text-slate-900">{instructor.full_name}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/96 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex w-full max-w-md gap-3 sm:max-w-2xl">
          <Link
            href={`/${school.slug}/entrar?next=agendar`}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-[14px] bg-[var(--primary)] px-4 text-[16px] font-medium text-white shadow-[0_12px_28px_rgba(0,0,0,0.16)] transition-transform active:scale-[0.99]"
          >
            Agendar agora
          </Link>
        </div>
      </div>

      {previewImage && (
        <button
          type="button"
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="relative max-h-[90vh] w-full max-w-md overflow-hidden rounded-[20px] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewImage.src} alt={previewImage.alt} className="max-h-[90vh] w-full object-contain" />
          </div>
        </button>
      )}
    </div>
  )
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-[16px] border border-slate-200 bg-white px-3 py-2.5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
      <Search size={16} className="text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full border-0 bg-transparent text-[14px] text-slate-700 outline-none placeholder:text-slate-400"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="text-slate-400">
          <X size={14} />
        </button>
      )}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[16px] border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-[14px] text-slate-500">
      {label}
    </div>
  )
}
