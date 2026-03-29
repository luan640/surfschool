'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, DollarSign, FileText, Layers3 } from 'lucide-react'
import { createLessonPackage, updateLessonPackage } from '@/actions/packages'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatPrice, initials } from '@/lib/utils'
import type { Instructor, LessonPackage } from '@/lib/types'

interface Props {
  instructors: Instructor[]
  pkg?: LessonPackage
}

export function PackageForm({ instructors, pkg }: Props) {
  const router = useRouter()
  const [selectedInstructorIds, setSelectedInstructorIds] = useState<string[]>(
    pkg?.instructors?.map((instructor) => instructor.id) ?? [],
  )
  const [active, setActive] = useState(pkg?.active ?? true)
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalLessons = Number(pkg?.lesson_count ?? 0)
  const packagePrice = Number(pkg?.price ?? 0)
  const pricePerLesson = totalLessons > 0 ? packagePrice / totalLessons : 0

  function toggleInstructor(id: string) {
    setSelectedInstructorIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    formData.set('active', String(active))
    formData.delete('instructor_ids')
    selectedInstructorIds.forEach((id) => formData.append('instructor_ids', id))

    const result = pkg
      ? await updateLessonPackage(pkg.id, formData)
      : await createLessonPackage(formData)

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/dashboard/packages')
    router.refresh()
  }

  function handleStatusToggle() {
    if (active) {
      setConfirmDeactivateOpen(true)
      return
    }

    setActive(true)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
      <div className="bg-white border border-slate-200 rounded p-6 space-y-4">
        <h2 className="font-condensed text-base font-bold uppercase text-slate-600 tracking-wide">
          Dados do pacote
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Nome *</label>
            <Input
              name="name"
              required
              defaultValue={pkg?.name ?? ''}
              placeholder="Pacote surf progression"
              icon={<Box size={14} />}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Quantidade de aulas *</label>
            <Input
              name="lesson_count"
              type="number"
              min="1"
              required
              defaultValue={pkg?.lesson_count ?? ''}
              placeholder="8"
              icon={<Layers3 size={14} />}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Valor total *</label>
            <Input
              name="price"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={pkg?.price ?? ''}
              placeholder="1200.00"
              icon={<DollarSign size={14} />}
            />
          </div>

          {!pkg && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
              <button
                type="button"
                onClick={() => setActive((value) => !value)}
                className="h-11 rounded-sm border border-slate-200 px-3 text-sm text-left text-slate-800 bg-white hover:border-[var(--primary)] transition-colors"
              >
                {active ? 'Ativo' : 'Inativo'}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Descricao</label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-slate-400 pointer-events-none">
              <FileText size={14} />
            </span>
            <textarea
              name="description"
              rows={4}
              defaultValue={pkg?.description ?? ''}
              placeholder="Explique o objetivo do pacote, publico e diferencas."
              className="w-full rounded-sm border border-slate-200 pl-10 pr-3 py-2 text-sm text-slate-800 bg-white resize-none focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
            />
          </div>
        </div>

        {pkg && (
          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={active ? 'success' : 'neutral'}>{active ? 'Ativo' : 'Inativo'}</Badge>
                <span className="text-sm text-slate-600">
                  {pkg.lesson_count} aulas por {formatPrice(Number(pkg.price))}
                </span>
                <span className="text-sm text-slate-400">
                  Media por aula: {formatPrice(pricePerLesson || 0)}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={handleStatusToggle}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                title={active ? 'Inativar pacote' : 'Ativar pacote'}
              >
                <span className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${active ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Pacotes nao sao excluidos por esta tela. Use o toggle para ativar ou inativar a oferta.
            </p>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="font-condensed text-base font-bold uppercase text-slate-600 tracking-wide">
              Instrutores aptos
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Selecione quais instrutores podem atender este pacote.
            </p>
          </div>
          <Badge variant="dark">{selectedInstructorIds.length} selecionado{selectedInstructorIds.length !== 1 ? 's' : ''}</Badge>
        </div>

        {instructors.length === 0 ? (
          <div className="rounded border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            Cadastre instrutores antes de criar um pacote.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {instructors.map((instructor) => {
              const selected = selectedInstructorIds.includes(instructor.id)
              return (
                <button
                  key={instructor.id}
                  type="button"
                  onClick={() => toggleInstructor(instructor.id)}
                  className={`text-left rounded border p-4 transition-colors ${
                    selected
                      ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                      : 'border-slate-200 bg-white hover:border-[var(--primary)]/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-condensed font-bold text-sm shrink-0"
                      style={{ background: instructor.color }}
                    >
                      {initials(instructor.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-800 truncate">{instructor.full_name}</p>
                        {selected && <Badge variant="default">Selecionado</Badge>}
                        {!instructor.active && <Badge variant="neutral">Inativo</Badge>}
                      </div>
                      {instructor.specialty && (
                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--primary)]">
                          {instructor.specialty}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Salvando...' : pkg ? 'Salvar alteracoes' : 'Criar pacote'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/packages')} disabled={loading}>
          Cancelar
        </Button>
      </div>

      {confirmDeactivateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4">
          <div className="w-full max-w-md rounded border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="font-condensed text-2xl font-bold uppercase text-slate-900">
              Inativar pacote?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              O pacote deixara de aparecer para novos agendamentos, mas continuara registrado no sistema.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  setActive(false)
                  setConfirmDeactivateOpen(false)
                }}
              >
                Confirmar inativacao
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmDeactivateOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
