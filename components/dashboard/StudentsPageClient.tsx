'use client'

import { useMemo, useState } from 'react'
import { Mail, Phone, Plus, Search, Users, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StudentForm } from '@/components/dashboard/StudentForm'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { formatCpf } from '@/lib/cpf'
import type { DashboardStudentRow } from '@/lib/types'

interface Props {
  students: DashboardStudentRow[]
}

type QuickFilter = 'trial_eligible' | 'has_upcoming'

export function StudentsPageClient({ students }: Props) {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [query, setQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<Set<QuickFilter>>(new Set())
  const pageSize = 10

  function toggleFilter(filter: QuickFilter) {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(filter)) next.delete(filter)
      else next.add(filter)
      return next
    })
    setCurrentPage(1)
  }

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return students.filter((student) => {
      if (normalizedQuery) {
        const haystack = `${student.full_name} ${student.email ?? ''} ${student.phone ?? ''}`.toLowerCase()
        if (!haystack.includes(normalizedQuery)) return false
      }
      if (activeFilters.has('trial_eligible') && !student.trial_lesson_eligible) return false
      if (activeFilters.has('has_upcoming') && student.upcoming_bookings === 0) return false
      return true
    })
  }, [students, query, activeFilters])

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredStudents.slice(start, start + pageSize)
  }, [currentPage, filteredStudents])

  return (
    <>
      <div className="dashboard-page">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
              Alunos
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {filteredStudents.length !== students.length
                ? `${filteredStudents.length} de ${students.length} aluno${students.length !== 1 ? 's' : ''}`
                : `${students.length} aluno${students.length !== 1 ? 's' : ''} cadastrado${students.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto">
            <Plus size={15} /> Novo aluno
          </Button>
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setCurrentPage(1) }}
              placeholder="Buscar por nome, e-mail ou telefone..."
              icon={<Search size={14} />}
              className="h-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleFilter('trial_eligible')}
              className={`inline-flex h-10 items-center gap-2 rounded border px-3 text-xs font-semibold transition-colors ${
                activeFilters.has('trial_eligible')
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              Apto aula experimental
            </button>
            <button
              type="button"
              onClick={() => toggleFilter('has_upcoming')}
              className={`inline-flex h-10 items-center gap-2 rounded border px-3 text-xs font-semibold transition-colors ${
                activeFilters.has('has_upcoming')
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              Com aulas futuras
            </button>
            {(query || activeFilters.size > 0) && (
              <button
                type="button"
                onClick={() => { setQuery(''); setActiveFilters(new Set()); setCurrentPage(1) }}
                className="inline-flex h-10 items-center gap-1.5 rounded border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 hover:border-slate-300"
              >
                <X size={13} /> Limpar
              </button>
            )}
          </div>
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
        ) : filteredStudents.length === 0 ? (
          <div className="rounded border border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
            Nenhum aluno encontrado com os filtros aplicados.
          </div>
        ) : (
          <div className="overflow-hidden rounded border border-slate-200 bg-white">
            <div className="hidden overflow-x-auto md:block">
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
            <div className="space-y-3 p-4 md:hidden">
              {paginatedStudents.map((student) => (
                <article key={student.id} className="rounded border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-800">{student.full_name}</div>
                      <div className="mt-1 text-sm text-slate-400">{student.email ?? 'Sem e-mail visivel'}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Badge variant="default">{student.total_bookings} total</Badge>
                      <Badge variant={student.upcoming_bookings > 0 ? 'success' : 'neutral'}>
                        {student.upcoming_bookings} futuras
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-slate-600">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Contato</div>
                      <div className="mt-1 flex items-center gap-2">
                        <Mail size={14} className="text-slate-400" />
                        <span>{student.email ?? '--'}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Phone size={14} className="text-slate-400" />
                        <span>{student.phone ?? '--'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">CPF</div>
                        <div>{student.cpf ? formatCpf(student.cpf) : '--'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Nascimento</div>
                        <div>
                          {student.birth_date
                            ? new Date(`${student.birth_date}T00:00:00`).toLocaleDateString('pt-BR')
                            : '--'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Cadastro</div>
                      <div>
                        {new Date(student.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredStudents.length}
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
