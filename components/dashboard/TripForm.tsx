'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, ImagePlus, MapPin, NotebookText, Tag, Users } from 'lucide-react'
import { createTrip, updateTrip } from '@/actions/trips'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Trip } from '@/lib/types'

interface Props {
  trip?: Trip
}

export function TripForm({ trip }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mediaError, setMediaError] = useState('')

  function validateFiles(files: FileList | null, mode: 'cover' | 'gallery') {
    if (!files || files.length === 0) {
      setMediaError('')
      return true
    }

    const maxSize = 4 * 1024 * 1024
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']

    for (const file of Array.from(files)) {
      if (!validTypes.includes(file.type)) {
        setMediaError('Use apenas imagens JPG, PNG ou WEBP.')
        return false
      }

      if (file.size > maxSize) {
        setMediaError(`Cada imagem ${mode === 'cover' ? 'de capa' : 'da galeria'} deve ter no maximo 4 MB.`)
        return false
      }
    }

    setMediaError('')
    return true
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(event.currentTarget)
    const result = trip
      ? await updateTrip(trip.id, formData)
      : await createTrip(formData)

    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }

    router.push('/dashboard/trips')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4 rounded border border-slate-200 bg-white p-6">
        <div>
          <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Informacoes da trip</h2>
          <p className="mt-1 text-sm text-slate-500">Defina o conteudo, o periodo e o valor da experiencia.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Titulo *</label>
            <Input name="title" required defaultValue={trip?.title ?? ''} placeholder="Trip para Fernando de Noronha" icon={<Tag size={14} />} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Slug publico</label>
            <Input name="slug" defaultValue={trip?.slug ?? ''} placeholder="noronha-2026" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Local</label>
            <Input name="location" defaultValue={trip?.location ?? ''} placeholder="Fernando de Noronha, PE" icon={<MapPin size={14} />} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Resumo</label>
            <Input name="summary" defaultValue={trip?.summary ?? ''} placeholder="Imersao de 4 dias com surf, video analise e grupo reduzido." />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Descricao</label>
            <textarea
              name="description"
              rows={6}
              defaultValue={trip?.description ?? ''}
              placeholder="Conte toda a proposta da trip, o que esta incluso e para quem ela foi pensada."
              className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white resize-none focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded border border-slate-200 bg-white p-6">
        <div>
          <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Periodo e vagas</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Inicio das inscricoes *</label>
            <Input name="starts_at" type="datetime-local" required defaultValue={trip ? formatDateTimeInput(trip.starts_at) : ''} icon={<CalendarDays size={14} />} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Fim das inscricoes *</label>
            <Input name="ends_at" type="datetime-local" required defaultValue={trip ? formatDateTimeInput(trip.ends_at) : ''} icon={<CalendarDays size={14} />} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Saida *</label>
            <Input name="departure_at" type="datetime-local" required defaultValue={trip ? formatDateTimeInput(trip.departure_at ?? trip.starts_at) : ''} icon={<CalendarDays size={14} />} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Chegada *</label>
            <Input name="arrival_at" type="datetime-local" required defaultValue={trip ? formatDateTimeInput(trip.arrival_at ?? trip.ends_at) : ''} icon={<CalendarDays size={14} />} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Valor *</label>
            <Input name="price" type="number" step="0.01" required defaultValue={trip?.price ?? ''} placeholder="2490.00" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Capacidade</label>
            <Input name="capacity" type="number" step="1" min="1" defaultValue={trip?.capacity ?? ''} placeholder="12" icon={<Users size={14} />} />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            name="allow_over_capacity"
            defaultChecked={trip?.allow_over_capacity ?? false}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
          />
          <span className="space-y-1">
            <span className="block font-bold text-slate-900">Aceitar capacidade excedente?</span>
            <span className="block text-slate-500">
              Quando ligado, a trip continua aceitando inscricoes mesmo depois de atingir a capacidade informada.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            name="allow_late_registrations"
            defaultChecked={trip?.allow_late_registrations ?? false}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
          />
          <span className="space-y-1">
            <span className="block font-bold text-slate-900">Aceitar inscricao depois da data limite?</span>
            <span className="block text-slate-500">
              Quando ligado, a inscricao continua liberada mesmo depois da data final informada para a trip.
            </span>
          </span>
        </label>

        <div className="flex flex-col gap-1.5 sm:max-w-xs">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
          <select
            name="active"
            defaultValue={trip?.active === false ? 'false' : 'true'}
            className="h-11 rounded-sm border border-slate-200 px-3 text-sm text-slate-800 bg-white focus:outline-none focus:border-[var(--primary)]"
          >
            <option value="true">Ativa</option>
            <option value="false">Inativa</option>
          </select>
        </div>
      </div>

      <div className="space-y-4 rounded border border-slate-200 bg-white p-6">
        <div>
          <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Midia da trip</h2>
          <p className="mt-1 text-sm text-slate-500">Suba uma imagem de capa e uma galeria para montar a pagina publica.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="space-y-3 rounded border border-dashed border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Capa</div>
            {trip?.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={trip.cover_image_url} alt={`Capa de ${trip.title}`} className="h-40 w-full rounded object-cover" />
            )}
            <input
              type="file"
              name="cover_image"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={(event) => {
                if (!validateFiles(event.target.files, 'cover')) event.target.value = ''
              }}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:font-bold file:uppercase file:text-white"
            />
          </div>

          <div className="space-y-3 rounded border border-dashed border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Galeria</div>
            {(trip?.images?.length ?? 0) > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {trip?.images?.map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={image.id} src={image.image_url} alt={trip.title} className="h-20 w-full rounded object-cover" />
                ))}
              </div>
            )}
            <div className="rounded border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
              <div className="inline-flex items-center gap-2">
                <ImagePlus size={14} />
                {trip?.images?.length ? 'Enviar novas imagens substitui a galeria atual.' : 'Adicione varias imagens para a pagina publica.'}
              </div>
            </div>
            <input
              type="file"
              name="gallery_images"
              multiple
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={(event) => {
                if (!validateFiles(event.target.files, 'gallery')) event.target.value = ''
              }}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:font-bold file:uppercase file:text-white"
            />
            {mediaError && <p className="text-sm font-medium text-rose-600">{mediaError}</p>}
          </div>
        </div>
      </div>

      {trip && (
        <div className="rounded border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <div className="inline-flex items-center gap-2">
            <NotebookText size={14} />
            Pagina publica: <span className="font-mono">{`/${'[school]'}/trips/${trip.slug}`}</span>
          </div>
        </div>
      )}

      {error && <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="flex justify-end gap-3">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Salvando...' : trip ? 'Salvar trip' : 'Criar trip'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/trips')}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function formatDateTimeInput(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
