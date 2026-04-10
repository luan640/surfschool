'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, X } from 'lucide-react'
import { saveTripSettings } from '@/actions/trips'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toaster'
import type { SchoolTripSettings } from '@/lib/types'

interface Props {
  settings: SchoolTripSettings
}

export function TripModeModal({ settings }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { success, error: showError } = useToast()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await saveTripSettings(formData)
      if (result.success) {
        success('Configurações de trip salvas.')
        setOpen(false)
      } else {
        showError(result.error ?? 'Não foi possível salvar.')
      }
    })
  }

  const modal = open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-lg rounded border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="font-condensed text-2xl font-bold uppercase tracking-wide text-slate-800">
              Modo trip
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Configure o período em que a escola estará em trip e como os agendamentos devem funcionar.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fechar">
            <X size={18} />
          </Button>
        </div>

        {/* Form */}
        <form action={handleSubmit} className="space-y-5 px-6 py-5">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Início da trip
              </label>
              <input
                type="date"
                name="trip_start_date"
                defaultValue={settings.trip_start_date ?? ''}
                className="h-10 rounded border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:border-slate-400"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Fim da trip
              </label>
              <input
                type="date"
                name="trip_end_date"
                defaultValue={settings.trip_end_date ?? ''}
                className="h-10 rounded border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {/* Booking mode */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Agendamentos durante a trip
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded border border-slate-200 p-4 hover:bg-slate-50">
              <input
                type="radio"
                name="booking_mode"
                value="both"
                defaultChecked={settings.booking_mode !== 'trip_only'}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-semibold text-slate-800">Aceitar agendamentos normais e na trip</div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Alunos podem agendar aulas no local habitual e também se inscrever na trip.
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded border border-slate-200 p-4 hover:bg-slate-50">
              <input
                type="radio"
                name="booking_mode"
                value="trip_only"
                defaultChecked={settings.booking_mode === 'trip_only'}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-semibold text-slate-800">Apenas inscrições na trip</div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Agendamentos normais ficam bloqueados nas datas da trip. Um aviso será exibido ao aluno.
                </p>
              </div>
            </label>
          </div>

          {/* Location note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Aviso para o aluno (opcional)
            </label>
            <Input
              name="location_note"
              defaultValue={settings.location_note ?? ''}
              placeholder="Ex: A escola estará em Floripa — inscreva-se na trip!"
              icon={<MapPin size={14} />}
            />
            <p className="text-[11px] text-slate-400">
              Exibido nos dias da trip durante o agendamento.
            </p>
          </div>

          {/* Clear dates shortcut */}
          <p className="text-[11px] text-slate-400">
            Deixe as datas em branco para desativar o modo trip.
          </p>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar configurações'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  ) : null

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Configurar modo trip" aria-label="Configurar modo trip">
        {/* gear icon via SVG for compatibility */}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </Button>
      {typeof document !== 'undefined' && modal ? createPortal(modal, document.body) : null}
    </>
  )
}
