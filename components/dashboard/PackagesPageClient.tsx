'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, Plus, Users, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PackageForm } from '@/components/dashboard/PackageForm'
import { formatPrice } from '@/lib/utils'
import type { Instructor, LessonPackage } from '@/lib/types'

interface Props {
  packages: LessonPackage[]
  instructors: Instructor[]
  mpConnected?: boolean
}

export function PackagesPageClient({ packages, instructors, mpConnected }: Props) {
  const [createModalOpen, setCreateModalOpen] = useState(false)

  return (
    <>
      <div className="dashboard-page">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-condensed text-3xl font-bold uppercase text-slate-800 tracking-wide">
              Pacotes
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {packages.length} pacote{packages.length !== 1 ? 's' : ''} cadastrado{packages.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto">
            <Plus size={15} /> Novo pacote
          </Button>
        </div>

        {packages.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded">
            <div className="text-4xl mb-3">📦</div>
            <h2 className="font-condensed text-xl font-bold text-slate-800 uppercase mb-2">
              Nenhum pacote ainda
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Crie pacotes de aulas com valor fixo e instrutores aptos.
            </p>
            <Button size="sm" onClick={() => setCreateModalOpen(true)}>
              <Plus size={15} /> Criar primeiro pacote
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-white border border-slate-200 rounded overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-1.5 bg-[var(--primary)]" />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <h3 className="font-condensed font-bold text-slate-800 uppercase tracking-wide text-lg truncate">
                        {pkg.name}
                      </h3>
                      <p className="text-slate-400 text-xs mt-1">
                        {pkg.lesson_count} aula{pkg.lesson_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Badge variant={pkg.active ? 'success' : 'neutral'}>
                      {pkg.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  {pkg.description && (
                    <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-3">
                      {pkg.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Valor do pacote</p>
                      <p className="font-condensed text-2xl font-bold text-[var(--primary)]">
                        {formatPrice(Number(pkg.price))}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Por aula</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {formatPrice(Number(pkg.price) / pkg.lesson_count)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">
                      Instrutores aptos
                    </p>
                    {(pkg.instructors?.length ?? 0) > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {pkg.instructors?.map((instructor) => (
                          <div key={instructor.id} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                            <span className="w-2 h-2 rounded-full" style={{ background: instructor.color }} />
                            {instructor.full_name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                        <Users size={12} /> Nenhum instrutor vinculado
                      </div>
                    )}
                  </div>

                  <Button asChild variant="ghost" size="sm" fullWidth>
                    <Link href={`/dashboard/packages/${pkg.id}`}>
                      <Pencil size={13} /> Editar
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded border border-slate-200 bg-slate-50 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase text-slate-800 tracking-wide">
                  Novo pacote
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Cadastre valor, quantidade de aulas e instrutores aptos sem sair da listagem.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCreateModalOpen(false)} aria-label="Fechar modal de novo pacote">
                <X size={18} />
              </Button>
            </div>

            <div className="p-6">
              <PackageForm
                instructors={instructors}
                onCancel={() => setCreateModalOpen(false)}
                onSuccess={() => setCreateModalOpen(false)}
                mpConnected={mpConnected}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
