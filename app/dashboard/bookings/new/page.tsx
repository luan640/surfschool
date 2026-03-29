import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getManualBookingOptions } from '@/actions/bookings'
import { ManualBookingForm } from '@/components/dashboard/ManualBookingForm'

export default async function NewManualBookingPage() {
  const { students, instructors } = await getManualBookingOptions()

  if (students.length === 0) {
    redirect('/dashboard/students/new')
  }

  if (instructors.length === 0) {
    redirect('/dashboard/instructors/new')
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      <div className="mb-8">
        <Link href="/dashboard/bookings" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft size={15} />
          Voltar para agendamentos
        </Link>
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Novo agendamento manual
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Selecione um aluno, um instrutor e os horarios livres para registrar a aula diretamente pelo painel.
        </p>
      </div>

      <ManualBookingForm students={students} instructors={instructors} />
    </div>
  )
}
