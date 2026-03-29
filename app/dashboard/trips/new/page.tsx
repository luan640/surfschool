import { TripForm } from '@/components/dashboard/TripForm'

export default function NewTripPage() {
  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Nova trip
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Monte uma pagina publica com informacoes, fotos e inscricao com pagamento online.
        </p>
      </div>

      <TripForm />
    </div>
  )
}
