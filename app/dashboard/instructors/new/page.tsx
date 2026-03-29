import { InstructorForm } from '@/components/dashboard/InstructorForm'

export default function NewInstructorPage() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase text-slate-800 tracking-wide">
          Novo Instrutor
        </h1>
        <p className="text-slate-400 text-sm mt-1">Preencha os dados e configure a disponibilidade.</p>
      </div>
      <InstructorForm />
    </div>
  )
}
