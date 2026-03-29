import { redirect } from 'next/navigation'
import { getTripById } from '@/actions/trips'
import { TripForm } from '@/components/dashboard/TripForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditTripPage({ params }: Props) {
  const { id } = await params
  const trip = await getTripById(id)

  if (!trip) {
    redirect('/dashboard/trips')
  }

  return (
    <div className="dashboard-page">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Editar trip
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Atualize conteudo, galeria e disponibilidade da experiencia.
        </p>
      </div>

      <TripForm trip={trip} />
    </div>
  )
}
