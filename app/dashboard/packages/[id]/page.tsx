import { redirect } from 'next/navigation'
import { getAvailablePackageInstructors, getLessonPackageById } from '@/actions/packages'
import { PackageForm } from '@/components/dashboard/PackageForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditPackagePage({ params }: Props) {
  const { id } = await params
  const [pkg, instructors] = await Promise.all([
    getLessonPackageById(id),
    getAvailablePackageInstructors(),
  ])

  if (!pkg) redirect('/dashboard/packages')

  return (
    <div className="dashboard-page">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase text-slate-800 tracking-wide">
          Editar pacote
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Atualize valor, quantidade de aulas e instrutores aptos.
        </p>
      </div>
      <PackageForm instructors={instructors} pkg={pkg} />
    </div>
  )
}
