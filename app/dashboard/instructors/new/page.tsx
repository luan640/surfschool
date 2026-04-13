import { getMercadoPagoConnection } from '@/actions/dashboard'
import { InstructorForm } from '@/components/dashboard/InstructorForm'

export default async function NewInstructorPage() {
  const connection = await getMercadoPagoConnection()

  return (
    <div className="dashboard-page">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase text-slate-800 tracking-wide">
          Novo Instrutor
        </h1>
        <p className="text-slate-400 text-sm mt-1">Preencha os dados e configure a disponibilidade.</p>
      </div>
      <InstructorForm mpConnected={connection?.status === 'connected'} />
    </div>
  )
}
