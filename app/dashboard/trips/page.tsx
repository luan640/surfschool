import Link from 'next/link'
import { CalendarDays, MapPin, Plus, Users } from 'lucide-react'
import { getSchoolSettings } from '@/actions/dashboard'
import { getTrips } from '@/actions/trips'
import { CopyBookingLinkButton } from '@/components/dashboard/CopyBookingLinkButton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'

export default async function TripsPage() {
  const school = await getSchoolSettings()
  const trips = await getTrips()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://surfbook.app'

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">Trips</h1>
          <p className="mt-1 text-sm text-slate-400">
            {trips.length} trip{trips.length !== 1 ? 's' : ''} cadastrada{trips.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/trips/new">
            <Plus size={15} /> Nova trip
          </Link>
        </Button>
      </div>

      {trips.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white py-16 text-center">
          <div className="mb-3 text-4xl">🏄</div>
          <h2 className="mb-2 font-condensed text-xl font-bold uppercase text-slate-800">Nenhuma trip ainda</h2>
          <p className="mb-6 text-sm text-slate-400">
            Crie experiencias especiais com pagina publica, galeria e inscricao online.
          </p>
          <Button asChild size="sm">
            <Link href="/dashboard/trips/new">
              <Plus size={15} /> Criar primeira trip
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {trips.map((trip) => (
            <div key={trip.id} className="overflow-hidden rounded border border-slate-200 bg-white transition-shadow hover:shadow-md">
              {trip.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={trip.cover_image_url} alt={trip.title} className="h-52 w-full object-cover" />
              ) : (
                <div className="flex h-52 items-center justify-center bg-[linear-gradient(135deg,#0d1b2a,#0284c7)] text-5xl text-white">🏄</div>
              )}

              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-condensed text-2xl font-bold uppercase text-slate-900">{trip.title}</h2>
                    {trip.summary && <p className="mt-2 text-sm text-slate-500">{trip.summary}</p>}
                  </div>
                  <Badge variant={trip.active ? 'success' : 'neutral'}>{trip.active ? 'Ativa' : 'Inativa'}</Badge>
                </div>

                <div className="grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="inline-flex items-center gap-2">
                    <CalendarDays size={14} className="text-slate-400" />
                    <span>
                      {new Date(trip.departure_at ?? trip.starts_at).toLocaleDateString('pt-BR')} - {new Date(trip.arrival_at ?? trip.ends_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400" />
                    <span>{trip.location ?? 'Local a definir'}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <Users size={14} className="text-slate-400" />
                    <span>{trip.paid_registrations_count ?? 0}/{trip.capacity ?? '∞'} inscritos pagos</span>
                  </div>
                  <div className="font-semibold text-[var(--primary)]">{formatPrice(Number(trip.price))}</div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <div className="text-xs text-slate-400">Slug publico: {trip.slug}</div>
                  <div className="flex items-center gap-2">
                    {school && <CopyBookingLinkButton url={`${appUrl}/${school.slug}/trips/${trip.slug}`} />}
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/dashboard/trips/${trip.id}`}>Editar</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
