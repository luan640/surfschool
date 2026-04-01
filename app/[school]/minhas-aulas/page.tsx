import Link from 'next/link'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { Calendar, Clock, ArrowLeft, ArrowRight, History, Mail, Phone, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getStudentBookingsBySchoolSlug, getStudentProfile } from '@/actions/bookings'
import { formatPrice, initials } from '@/lib/utils'

interface Props {
  params: Promise<{ school: string }>
  searchParams?: Promise<{ tab?: string }>
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  completed: 'Concluida',
  cancelled: 'Cancelada',
}

export default async function StudentLessonsPage({ params, searchParams }: Props) {
  const { school: slug } = await params
  const query = searchParams ? await searchParams : undefined
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${slug}/entrar?mode=login&next=minhas-aulas`)
  }

  const { data: school } = await supabase
    .from('schools')
    .select('id, name, slug, tagline, logo_url')
    .eq('slug', slug)
    .single()

  if (!school) {
    redirect('/')
  }

  const [bookings, profile] = await Promise.all([
    getStudentBookingsBySchoolSlug(slug),
    getStudentProfile(school.id),
  ])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const activeTab = resolveStudentTab(query?.tab)

  const upcoming = bookings.filter((booking) => {
    const lessonDate = new Date(`${booking.lesson_date}T00:00:00`)
    return lessonDate >= today && booking.status !== 'cancelled'
  })

  const history = bookings.filter((booking) => {
    const lessonDate = new Date(`${booking.lesson_date}T00:00:00`)
    return lessonDate < today || booking.status === 'cancelled'
  })

  return (
    <div className="min-h-dvh bg-[#f4f5f7] pb-28 text-slate-900">
      <div className="mx-auto w-full max-w-md px-3 py-3 sm:max-w-2xl sm:px-5">
        <div className="mb-2 flex items-center justify-between px-1">
          <Link
            href={`/${slug}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-[0_4px_12px_rgba(15,23,42,0.04)]"
            aria-label="Voltar"
          >
            <ArrowLeft size={16} />
          </Link>
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
                {school.tagline || 'Acompanhe suas aulas e organize suas proximas reservas.'}
              </div>
            </div>
            <Link
              href={`/${slug}/agendar`}
              className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-3 text-[11px] font-semibold text-slate-600"
            >
              Agendar
            </Link>
          </div>

          <div className="mt-4 flex items-center gap-5 overflow-x-auto border-b border-slate-100 pb-1">
            {[
              { href: `/${slug}/minhas-aulas?tab=upcoming`, label: 'Próximas aulas', key: 'upcoming' },
              { href: `/${slug}/minhas-aulas?tab=history`, label: 'Histórico', key: 'history' },
              { href: `/${slug}/minhas-aulas?tab=profile`, label: 'Perfil', key: 'profile' },
            ].map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                className={`relative whitespace-nowrap pb-2 text-[14px] font-medium transition-colors ${
                  activeTab === tab.key ? 'text-[var(--primary)]' : 'text-slate-500'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--primary)]" />}
              </Link>
            ))}
          </div>
        </header>

        <main className="mt-3 space-y-3">
          {activeTab === 'upcoming' && (
          <section className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-[22px] font-semibold text-slate-900">Proximas aulas</h1>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                  Visualize suas reservas confirmadas e acompanhe o que vem pela frente.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)]/8 px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)]">
                <Calendar size={12} />
                {upcoming.length} futuras
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {upcoming.length === 0 ? (
                <EmptyLessonState label="Voce nao tem aulas futuras no momento." />
              ) : (
                upcoming.map((booking) => (
                  <LessonCard key={booking.id} booking={booking} />
                ))
              )}
            </div>
          </section>
          )}

          {activeTab === 'history' && (
          <section className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[22px] font-semibold text-slate-900">Historico</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                  Revise aulas passadas e reservas canceladas no mesmo painel.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                <History size={12} />
                {history.length} registros
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {history.length === 0 ? (
                <EmptyLessonState label="Seu historico de aulas aparecera aqui." />
              ) : (
                history.map((booking) => (
                  <LessonCard key={booking.id} booking={booking} />
                ))
              )}
            </div>
          </section>
          )}

          {activeTab === 'profile' && (
          <section className="rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[22px] font-semibold text-slate-900">Perfil</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                  Confira os dados vinculados ao seu cadastro nesta escola.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                <UserRound size={12} />
                Cadastro
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <ProfileItem label="Nome" value={profile?.full_name ?? 'Nao informado'} icon={<UserRound size={14} />} />
              <ProfileItem label="E-mail" value={profile?.email ?? user.email ?? 'Nao informado'} icon={<Mail size={14} />} />
              <ProfileItem label="Telefone" value={profile?.phone ?? 'Nao informado'} icon={<Phone size={14} />} />
              <ProfileItem label="Data de nascimento" value={profile?.birth_date ? new Date(`${profile.birth_date}T00:00:00`).toLocaleDateString('pt-BR') : 'Nao informada'} icon={<Calendar size={14} />} />
            </div>
          </section>
          )}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/96 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex w-full max-w-md gap-3 sm:max-w-2xl">
          <Link
            href={`/${slug}/agendar`}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-[14px] bg-[var(--primary)] px-4 text-[16px] font-medium text-white shadow-[0_12px_28px_rgba(0,0,0,0.16)] transition-transform active:scale-[0.99]"
          >
            Agendar agora
            <ArrowRight size={15} className="ml-2" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function LessonCard({ booking }: { booking: Awaited<ReturnType<typeof getStudentBookingsBySchoolSlug>>[number] }) {
  return (
    <article className="rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[16px] font-semibold text-slate-900">
            {booking.instructor?.full_name ?? 'Instrutor'}
          </div>
          <div className="mt-1 text-[13px] text-slate-500">
            {new Date(`${booking.lesson_date}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <div className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {STATUS_LABEL[booking.status] ?? booking.status}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[13px] text-slate-500">
        <Clock size={14} />
        {booking.time_slots.join(', ')}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-200 pt-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Total</div>
          <div className="font-condensed text-2xl font-bold text-slate-900">{formatPrice(booking.total_amount)}</div>
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

function resolveStudentTab(tab: string | undefined): 'upcoming' | 'history' | 'profile' {
  if (tab === 'history' || tab === 'profile') return tab
  return 'upcoming'
}
