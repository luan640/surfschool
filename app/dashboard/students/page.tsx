import Link from 'next/link'
import { Mail, Phone, Plus, Users } from 'lucide-react'
import { getDashboardStudents } from '@/actions/students'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default async function StudentsPage() {
  const students = await getDashboardStudents()

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
            Alunos
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {students.length} aluno{students.length !== 1 ? 's' : ''} cadastrado{students.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/students/new">
            <Plus size={15} /> Novo aluno
          </Link>
        </Button>
      </div>

      {students.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white py-16 text-center">
          <div className="mb-3 flex justify-center text-slate-400">
            <Users size={38} />
          </div>
          <h2 className="mb-2 font-condensed text-xl font-bold uppercase text-slate-800">Nenhum aluno ainda</h2>
          <p className="mb-6 text-sm text-slate-400">
            Cadastre alunos manualmente para a escola acompanhar a base e iniciar novos agendamentos.
          </p>
          <Button asChild size="sm">
            <Link href="/dashboard/students/new">
              <Plus size={15} /> Cadastrar primeiro aluno
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Aluno</th>
                  <th className="px-5 py-3">Contato</th>
                  <th className="px-5 py-3">Aulas</th>
                  <th className="px-5 py-3">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id} className="align-top">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{student.full_name}</div>
                      <div className="mt-1 text-sm text-slate-400">{student.email ?? 'Sem e-mail visivel'}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      <div className="flex flex-col gap-2">
                        <div className="inline-flex items-center gap-2">
                          <Mail size={14} className="text-slate-400" />
                          <span>{student.email ?? '--'}</span>
                        </div>
                        <div className="inline-flex items-center gap-2">
                          <Phone size={14} className="text-slate-400" />
                          <span>{student.phone ?? '--'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="default">{student.total_bookings} total</Badge>
                        <Badge variant={student.upcoming_bookings > 0 ? 'success' : 'neutral'}>
                          {student.upcoming_bookings} futuras
                        </Badge>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {new Date(student.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
