import { PackageForm } from '@/components/dashboard/PackageForm'
import { getAvailablePackageInstructors } from '@/actions/packages'
import { getMercadoPagoConnection } from '@/actions/dashboard'

export default async function NewPackagePage() {
  const [instructors, connection] = await Promise.all([
    getAvailablePackageInstructors(),
    getMercadoPagoConnection(),
  ])

  return (
    <div className="dashboard-page">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase text-slate-800 tracking-wide">
          Novo pacote
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Defina valor, quantidade de aulas e quais instrutores podem atender.
        </p>
      </div>
      <PackageForm instructors={instructors} mpConnected={connection?.status === 'connected'} />
    </div>
  )
}
