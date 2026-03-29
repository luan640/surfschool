import { StudentForm } from '@/components/dashboard/StudentForm'

export default function NewStudentPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Novo aluno
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Cadastre o aluno manualmente para que ele ja possa entrar e agendar aulas.
        </p>
      </div>
      <StudentForm />
    </div>
  )
}
