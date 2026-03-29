'use client'

import { useMemo, useState } from 'react'
import { Mail, Phone, Plus, Users, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StudentForm } from '@/components/dashboard/StudentForm'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { formatCpf } from '@/lib/cpf'
import type { DashboardStudentRow } from '@/lib/types'

interface Props {
  students: DashboardStudentRow[]
}

export function StudentsPageClient({ students }: Props) {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return students.slice(start, start + pageSize)
  }, [currentPage, students])

  return (
    <>
      <div className="dashboard-page">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
              Alunos
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {students.length} aluno{students.length !== 1 ? 's' : ''} cadastrado{students.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateModalOpen(true)}>
            <Plus size={15} /> Novo aluno
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
            <Button size="sm" onClick={() => setCreateModalOpen(true)}>
              <Plus size={15} /> Cadastrar primeiro aluno
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
                    <th className="px-5 py-3">Documento</th>
                    <th className="px-5 py-3">Aulas</th>
                    <th className="px-5 py-3">Cadastro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedStudents.map((student) => (
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
                      <td className="px-5 py-4 text-sm text-slate-600">
                        <div className="flex flex-col gap-2">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">CPF</span>
                            <div>{student.cpf ? formatCpf(student.cpf) : '--'}</div>
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Nascimento</span>
                            <div>
                              {student.birth_date
                                ? new Date(`${student.birth_date}T00:00:00`).toLocaleDateString('pt-BR')
                                : '--'}
                            </div>
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
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={students.length}
              onPageChange={setCurrentPage}
              itemLabel="alunos"
            />
          </div>
        )}
      </div>

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded border border-slate-200 bg-slate-50 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
                  Novo aluno
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Cadastre o aluno sem sair da listagem.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCreateModalOpen(false)} aria-label="Fechar modal de novo aluno">
                <X size={18} />
              </Button>
            </div>

            <div className="p-6">
              <StudentForm
                onCancel={() => setCreateModalOpen(false)}
                onSuccess={() => setCreateModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
