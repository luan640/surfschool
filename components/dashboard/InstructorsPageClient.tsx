'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Instagram, Pencil, Phone, Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InstructorForm } from '@/components/dashboard/InstructorForm'
import { formatPrice, initials, WEEKDAYS_PT } from '@/lib/utils'
import type { Instructor } from '@/lib/types'

interface Props {
  instructors: Instructor[]
}

export function InstructorsPageClient({ instructors }: Props) {
  const [createModalOpen, setCreateModalOpen] = useState(false)

  return (
    <>
      <div className="dashboard-page">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-condensed text-3xl font-bold uppercase text-slate-800 tracking-wide">
              Instrutores
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {instructors.length} instrutor{instructors.length !== 1 ? 'es' : ''} cadastrado{instructors.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateModalOpen(true)} className="w-full sm:w-auto">
            <Plus size={15} /> Novo Instrutor
          </Button>
        </div>

        {instructors.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded">
            <div className="text-4xl mb-3">🏄</div>
            <h2 className="font-condensed text-xl font-bold text-slate-800 uppercase mb-2">
              Nenhum instrutor ainda
            </h2>
            <p className="text-slate-400 text-sm mb-6">Cadastre o primeiro instrutor da sua escola.</p>
            <Button size="sm" onClick={() => setCreateModalOpen(true)}>
              <Plus size={15} /> Adicionar
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {instructors.map((instr) => {
              const availDays = (instr.availability ?? []).map((a) => WEEKDAYS_PT[a.weekday]).join(', ')
              return (
                <div key={instr.id} className="bg-white border border-slate-200 rounded overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-1.5" style={{ background: instr.color }} />

                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      {instr.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={instr.photo_url} alt={instr.full_name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-condensed font-bold text-base shrink-0"
                          style={{ background: instr.color }}
                        >
                          {initials(instr.full_name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-condensed font-bold text-slate-800 uppercase tracking-wide text-base truncate">
                          {instr.full_name}
                        </h3>
                        {instr.specialty && (
                          <p className="text-[var(--primary)] text-xs font-bold uppercase tracking-wide">{instr.specialty}</p>
                        )}
                      </div>
                      <Badge variant={instr.active ? 'success' : 'neutral'} className="shrink-0 text-[10px]">
                        {instr.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>

                    {instr.bio && (
                      <p className="text-slate-500 text-xs leading-relaxed mb-3 line-clamp-2">{instr.bio}</p>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <span className="font-condensed text-xl font-bold" style={{ color: 'var(--primary)' }}>
                        {formatPrice(instr.hourly_price)}
                        <span className="text-slate-400 text-xs font-normal font-sans">/hora</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {instr.phone && (
                          <a href={`tel:${instr.phone}`} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <Phone size={14} />
                          </a>
                        )}
                        {instr.instagram && (
                          <a
                            href={`https://instagram.com/${instr.instagram.replace('@', '')}`}
                            target="_blank"
                            className="text-slate-400 hover:text-pink-500 transition-colors"
                          >
                            <Instagram size={14} />
                          </a>
                        )}
                      </div>
                    </div>

                    {availDays && (
                      <p className="text-xs text-slate-400 mb-4">
                        📅 {availDays}
                      </p>
                    )}

                    <Button asChild variant="ghost" size="sm" fullWidth>
                      <Link href={`/dashboard/instructors/${instr.id}`}>
                        <Pencil size={13} /> Editar
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded border border-slate-200 bg-slate-50 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="font-condensed text-3xl font-bold uppercase text-slate-800 tracking-wide">
                  Novo Instrutor
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Cadastre dados, foto e disponibilidade sem sair da listagem.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setCreateModalOpen(false)} aria-label="Fechar modal de novo instrutor">
                <X size={18} />
              </Button>
            </div>

            <div className="p-6">
              <InstructorForm
                layout="modal"
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
