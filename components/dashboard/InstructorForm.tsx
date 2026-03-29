'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { WEEKDAYS_PT } from '@/lib/utils'
import type { Instructor } from '@/lib/types'
import { createInstructor, updateInstructor, saveAvailability } from '@/actions/instructors'
import { User, Phone, Instagram, DollarSign, FileText } from 'lucide-react'

const TIME_OPTIONS = [
  '05:00','06:00','07:00','08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00',
]

const AVATAR_COLORS = [
  '#0077b6','#1a6b5a','#7c3aed','#dc2626','#ea580c',
  '#ca8a04','#16a34a','#0891b2','#9333ea','#db2777',
]

interface Props {
  instructor?: Instructor
}

export function InstructorForm({ instructor }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [color, setColor]     = useState(instructor?.color ?? '#0077b6')

  // Availability state: weekday → selected time slots
  const [avail, setAvail] = useState<Record<number, string[]>>(() => {
    const init: Record<number, string[]> = {}
    for (let i = 0; i <= 6; i++) {
      const existing = instructor?.availability?.find(a => a.weekday === i)
      init[i] = existing?.time_slots ?? []
    }
    return init
  })

  function toggleSlot(weekday: number, slot: string) {
    setAvail(prev => {
      const current = prev[weekday] ?? []
      return {
        ...prev,
        [weekday]: current.includes(slot)
          ? current.filter(s => s !== slot)
          : [...current, slot].sort(),
      }
    })
  }

  function toggleAllSlots(weekday: number) {
    setAvail(prev => {
      const current = prev[weekday] ?? []
      const allSelected = current.length === TIME_OPTIONS.length

      return {
        ...prev,
        [weekday]: allSelected ? [] : [...TIME_OPTIONS],
      }
    })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    fd.set('color', color)

    const result = instructor
      ? await updateInstructor(instructor.id, fd)
      : await createInstructor(fd)

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    const instrId = instructor?.id ?? (result as { success: true; data: Instructor }).data.id
    const availArr = Object.entries(avail).map(([wd, slots]) => ({
      weekday: Number(wd),
      time_slots: slots,
    }))
    await saveAvailability(instrId, availArr)
    router.push('/dashboard/instructors')
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      {/* Basic info */}
      <div className="bg-white border border-slate-200 rounded p-6 space-y-4">
        <h2 className="font-condensed text-base font-bold uppercase text-slate-600 tracking-wide">
          Informações
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Nome *</label>
            <Input name="full_name" required defaultValue={instructor?.full_name} placeholder="Nome completo"
              icon={<User size={14} />} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Especialidade</label>
            <Input name="specialty" defaultValue={instructor?.specialty ?? ''} placeholder="ex: Shortboard, Longboard" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Telefone / WhatsApp</label>
            <Input name="phone" defaultValue={instructor?.phone ?? ''} placeholder="(48) 9 9999-0000"
              icon={<Phone size={14} />} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Instagram</label>
            <Input name="instagram" defaultValue={instructor?.instagram ?? ''} placeholder="@usuario"
              icon={<Instagram size={14} />} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Valor por hora (R$) *</label>
            <Input name="hourly_price" type="number" step="0.01" required
              defaultValue={instructor?.hourly_price}
              placeholder="150.00"
              icon={<DollarSign size={14} />} />
          </div>
          {instructor && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
              <select name="active" defaultValue={instructor.active ? 'true' : 'false'}
                className="h-11 rounded-sm border border-slate-200 px-3 text-sm text-slate-800 bg-white focus:outline-none focus:border-[var(--primary)]">
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Bio</label>
          <textarea name="bio" rows={3} defaultValue={instructor?.bio ?? ''}
            placeholder="Certificações, experiência, estilo de ensino..."
            className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white resize-none focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10" />
        </div>

        {/* Avatar color */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500 block mb-2">Cor do avatar</label>
          <div className="flex gap-2 flex-wrap">
            {AVATAR_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110 border-2"
                style={{
                  background: c,
                  borderColor: color === c ? '#0f172a' : 'transparent',
                  outline: color === c ? '2px solid white' : 'none',
                  outlineOffset: '-3px',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="bg-white border border-slate-200 rounded p-6">
        <h2 className="font-condensed text-base font-bold uppercase text-slate-600 tracking-wide mb-5">
          Disponibilidade
        </h2>
        <div className="space-y-4">
          {WEEKDAYS_PT.map((day, wd) => (
            <div key={wd}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{day}</p>
                <button
                  type="button"
                  onClick={() => toggleAllSlots(wd)}
                  className="text-[11px] font-bold uppercase tracking-wide text-[var(--primary)] hover:underline"
                >
                  {(avail[wd]?.length ?? 0) === TIME_OPTIONS.length ? 'Limpar' : 'Selecionar todos'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TIME_OPTIONS.map(slot => {
                  const selected = avail[wd]?.includes(slot)
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => toggleSlot(wd, slot)}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-colors border ${
                        selected
                          ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                          : 'border-slate-200 text-slate-500 hover:border-[var(--primary)] hover:text-[var(--primary)]'
                      }`}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Salvando...' : instructor ? 'Salvar alterações' : 'Criar instrutor'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
