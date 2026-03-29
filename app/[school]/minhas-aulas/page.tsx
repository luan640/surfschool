import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Calendar, Clock, ArrowLeft, ArrowRight, History } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getStudentBookingsBySchoolSlug } from '@/actions/bookings'
import { formatPrice } from '@/lib/utils'

interface Props {
  params: Promise<{ school: string }>
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  completed: 'Concluida',
  cancelled: 'Cancelada',
}

export default async function StudentLessonsPage({ params }: Props) {
  const { school: slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${slug}/entrar?mode=login&next=minhas-aulas`)
  }

  const { data: school } = await supabase
    .from('schools')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (!school) {
    redirect('/')
  }

  const bookings = await getStudentBookingsBySchoolSlug(slug)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcoming = bookings.filter((booking) => {
    const lessonDate = new Date(`${booking.lesson_date}T00:00:00`)
    return lessonDate >= today && booking.status !== 'cancelled'
  })

  const history = bookings.filter((booking) => {
    const lessonDate = new Date(`${booking.lesson_date}T00:00:00`)
    return lessonDate < today || booking.status === 'cancelled'
  })

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="flex h-14 items-center gap-3 bg-slate-950 px-4 text-white">
        <Link href={`/${slug}`} className="text-white/70 transition-colors hover:text-white">
          <ArrowLeft size={18} />
        </Link>
        <div className="font-condensed text-lg font-bold uppercase">{school.name}</div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-6 flex flex-col gap-4 rounded border border-slate-200 bg-white p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-condensed text-3xl font-bold uppercase text-slate-900">Minhas aulas</h1>
            <p className="mt-1 text-sm text-slate-500">Visualize seu historico e agende novas aulas quando quiser.</p>
          </div>
          <Link
            href={`/${slug}/agendar`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded bg-slate-900 px-4 text-sm font-bold uppercase text-white"
          >
            Agendar mais aulas
            <ArrowRight size={15} />
          </Link>
        </div>

        <section className="mb-6 rounded border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <Calendar size={16} className="text-slate-500" />
            <h2 className="font-condensed text-xl font-bold uppercase text-slate-900">Proximas aulas</h2>
          </div>
          {upcoming.length === 0 ? (
            <div className="px-5 py-10 text-sm text-slate-500">Voce nao tem aulas futuras no momento.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcoming.map((booking) => (
                <LessonCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <History size={16} className="text-slate-500" />
            <h2 className="font-condensed text-xl font-bold uppercase text-slate-900">Historico</h2>
          </div>
          {history.length === 0 ? (
            <div className="px-5 py-10 text-sm text-slate-500">Seu historico de aulas aparecera aqui.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map((booking) => (
                <LessonCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function LessonCard({ booking }: { booking: Awaited<ReturnType<typeof getStudentBookingsBySchoolSlug>>[number] }) {
  return (
    <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <div className="font-condensed text-lg font-bold uppercase text-slate-900">{booking.instructor?.full_name ?? 'Instrutor'}</div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span>{new Date(`${booking.lesson_date}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <span className="inline-flex items-center gap-1">
            <Clock size={14} />
            {booking.time_slots.join(', ')}
          </span>
        </div>
        <div className="text-sm text-slate-500">
          Status: <span className="font-semibold text-slate-700">{STATUS_LABEL[booking.status] ?? booking.status}</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs font-bold uppercase text-slate-400">Total</div>
        <div className="font-condensed text-2xl font-bold text-slate-900">{formatPrice(booking.total_amount)}</div>
      </div>
    </div>
  )
}
