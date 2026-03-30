import { redirect } from 'next/navigation'
import { getTripById, getTripRegistrations } from '@/actions/trips'
import { TripRegistrationsSection } from '@/components/dashboard/TripRegistrationsSection'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TripRegistrationsPage({ params }: Props) {
  const { id } = await params
  const [trip, registrations] = await Promise.all([
    getTripById(id),
    getTripRegistrations(id),
  ])

  if (!trip) {
    redirect('/dashboard/trips')
  }

  return (
    <div className="dashboard-page">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Inscritos da trip
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {trip.title}
        </p>
      </div>

      <TripRegistrationsSection trip={trip} registrations={registrations} />
    </div>
  )
}
