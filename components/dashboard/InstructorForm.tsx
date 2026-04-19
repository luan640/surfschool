'use client'

import { useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Clock3, DollarSign, ImageUp, Instagram, Phone, User } from 'lucide-react'
import { createInstructor, saveAvailability, updateInstructor } from '@/actions/instructors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toaster'
import type { Instructor } from '@/lib/types'
import { WEEKDAYS_PT } from '@/lib/utils'

const TIME_OPTIONS = [
  '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
]

const AVATAR_COLORS = [
  '#0077b6', '#1a6b5a', '#7c3aed', '#dc2626', '#ea580c',
  '#ca8a04', '#16a34a', '#0891b2', '#9333ea', '#db2777',
]

type SectionKey = 'profile' | 'availability'

interface Props {
  instructor?: Instructor
  onSuccess?: () => void
  onCancel?: () => void
  layout?: 'default' | 'modal'
  mpConnected?: boolean
}

export function InstructorForm({
  instructor,
  onSuccess,
  onCancel,
  layout = 'default',
  mpConnected = false,
}: Props) {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [color, setColor] = useState(instructor?.color ?? '#0077b6')
  const [photoError, setPhotoError] = useState('')
  const [photoPreview, setPhotoPreview] = useState(instructor?.photo_url ?? '')
  const [activeSection, setActiveSection] = useState<SectionKey>('profile')
  const [fullName, setFullName] = useState(instructor?.full_name ?? '')
  const [hourlyPrice, setHourlyPrice] = useState(
    instructor?.hourly_price ? String(instructor.hourly_price) : '',
  )

  const [pixPrice, setPixPrice] = useState(instructor?.pix_price ? String(instructor.pix_price) : '')
  const [cardPrice, setCardPrice] = useState(instructor?.card_price ? String(instructor.card_price) : '')

  const MP_FEES = { pix: 0.0099, card1x: 0.0498, card12x: 0.0679 }
  const mpNet = (gross: number, fee: number) => (Math.floor(gross * (1 - fee) * 100) / 100).toFixed(2)
  const mpGross = (net: number, fee: number) => (Math.ceil(net / (1 - fee) * 100) / 100).toFixed(2)

  const [pixReceive, setPixReceive] = useState(
    instructor?.pix_price ? mpNet(instructor.pix_price, MP_FEES.pix) : ''
  )
  const [cardPrice12x, setCardPrice12x] = useState(instructor?.card12x_price ? String(instructor.card12x_price) : '')
  const [cardReceive, setCardReceive] = useState(
    instructor?.card_price ? mpNet(instructor.card_price, MP_FEES.card1x) : ''
  )
  const [card12xReceive, setCard12xReceive] = useState(
    instructor?.card12x_price ? mpNet(instructor.card12x_price, MP_FEES.card12x) : ''
  )

  const [avail, setAvail] = useState<Record<number, string[]>>(() => {
    const init: Record<number, string[]> = {}
    for (let i = 0; i <= 6; i++) {
      const existing = instructor?.availability?.find((item) => item.weekday === i)
      init[i] = existing?.time_slots ?? []
    }
    return init
  })

  const hasAvailability = Object.values(avail).some((slots) => slots.length > 0)
  const profileComplete = fullName.trim().length > 0 && Number(pixPrice) > 0 && Number(cardPrice) > 0 && Number(cardPrice12x) > 0 && !photoError

  const sections = [
    {
      key: 'profile' as const,
      title: 'Dados cadastrais',
      description: 'Foto, contato, bio e valor por hora.',
      complete: profileComplete,
      icon: User,
    },
    {
      key: 'availability' as const,
      title: 'Horarios',
      description: 'Dias e faixas de atendimento.',
      complete: hasAvailability,
      icon: Clock3,
    },
  ]

  function toggleSlot(weekday: number, slot: string) {
    setAvail((prev) => {
      const current = prev[weekday] ?? []
      return {
        ...prev,
        [weekday]: current.includes(slot)
          ? current.filter((item) => item !== slot)
          : [...current, slot].sort(),
      }
    })
  }

  function toggleAllSlots(weekday: number) {
    setAvail((prev) => {
      const current = prev[weekday] ?? []
      const allSelected = current.length === TIME_OPTIONS.length

      return {
        ...prev,
        [weekday]: allSelected ? [] : [...TIME_OPTIONS],
      }
    })
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      setPhotoError('')
      setPhotoPreview(instructor?.photo_url ?? '')
      return
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (!validTypes.includes(file.type)) {
      event.target.value = ''
      setPhotoError('Use apenas arquivos JPG, PNG ou WEBP.')
      setPhotoPreview(instructor?.photo_url ?? '')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      event.target.value = ''
      setPhotoError('A foto deve ter no maximo 2 MB.')
      setPhotoPreview(instructor?.photo_url ?? '')
      return
    }

    setPhotoError('')
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    formData.set('color', color)

    const result = instructor
      ? await updateInstructor(instructor.id, formData)
      : await createInstructor(formData)

    if (!result.success) {
      setError(result.error)
      showError(instructor ? 'Não foi possível salvar o instrutor.' : 'Não foi possível criar o instrutor.', result.error)
      setLoading(false)
      return
    }

    const instructorId = instructor?.id ?? (result as { success: true; data: Instructor }).data.id
    const availabilityRows = Object.entries(avail).map(([weekday, slots]) => ({
      weekday: Number(weekday),
      time_slots: slots,
    }))

    const availabilityResult = await saveAvailability(instructorId, availabilityRows)
    if (!availabilityResult.success) {
      setError(availabilityResult.error)
      showError('Não foi possível salvar os horarios do instrutor.', availabilityResult.error)
      setLoading(false)
      return
    }

    success(instructor ? 'Instrutor atualizado com sucesso.' : 'Instrutor criado com sucesso.')

    if (onSuccess) {
      onSuccess()
      router.refresh()
      return
    }

    router.push('/dashboard/instructors')
  }

  const profileSection = (
    <div className="bg-white border border-slate-200 rounded p-6 space-y-4">
      <h2 className="font-condensed text-base font-bold uppercase text-slate-600 tracking-wide">
        Informaçoes
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Foto do instrutor</label>
          <div className="flex flex-col gap-4 rounded border border-dashed border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shrink-0">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt={`Foto de ${instructor?.full_name ?? 'instrutor'}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-400">
                  <ImageUp size={18} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Sem foto</span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <input
                type="file"
                name="photo_file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:font-bold file:uppercase file:text-white"
              />
              <p className="mt-2 text-xs text-slate-400">JPG, PNG ou WEBP com ate 2 MB.</p>
              {photoError && <p className="mt-2 text-sm font-medium text-rose-600">{photoError}</p>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Nome *</label>
          <Input
            name="full_name"
            required
            defaultValue={instructor?.full_name}
            placeholder="Nome completo"
            icon={<User size={14} />}
            onChange={(event) => setFullName(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Especialidade</label>
          <Input name="specialty" defaultValue={instructor?.specialty ?? ''} placeholder="ex: Shortboard, Longboard" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Telefone / WhatsApp</label>
          <Input
            name="phone"
            type="tel"
            defaultValue={instructor?.phone ?? ''}
            placeholder="+55 48 99999 0000"
            icon={<Phone size={14} />}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Instagram</label>
          <Input
            name="instagram"
            defaultValue={instructor?.instagram ?? ''}
            placeholder="@usuario"
            icon={<Instagram size={14} />}
          />
        </div>

        <div className="sm:col-span-2 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Preços para pagamento presencial
          </p>
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs text-slate-500">Valor cobrado quando o pagamento é feito no local (dinheiro, cartão na maquininha, etc).</p>
            <div className="flex flex-col gap-1 max-w-xs">
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Valor por aula <span className="font-normal normal-case tracking-normal text-slate-400">(cartão de crédito pode ter taxas)</span>
              </label>
              <Input
                name="hourly_price"
                type="number"
                step="0.01"
                required
                value={hourlyPrice}
                placeholder="150.00"
                icon={<DollarSign size={14} />}
                onChange={(e) => setHourlyPrice(e.target.value)}
              />
            </div>
          </div>
        </div>

        {mpConnected && (
          <div className="sm:col-span-2 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Preços por método de pagamento (online)
            </p>

            {/* PIX */}
            <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-2">
              <p className="text-xs font-bold text-slate-600">PIX <span className="font-normal text-slate-400">(taxa 0,99%)</span></p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Valor cobrado</label>
                  <Input
                    name="pix_price"
                    type="number"
                    step="0.01"
                    required
                    value={pixPrice}
                    placeholder="150.00"
                    icon={<DollarSign size={14} />}
                    onChange={(e) => {
                      setPixPrice(e.target.value)
                      const gross = Number(e.target.value)
                      setPixReceive(gross > 0 ? mpNet(gross, MP_FEES.pix) : '')
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Você recebe</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={pixReceive}
                    placeholder="148.51"
                    icon={<DollarSign size={14} />}
                    onChange={(e) => {
                      setPixReceive(e.target.value)
                      const net = Number(e.target.value)
                      setPixPrice(net > 0 ? mpGross(net, MP_FEES.pix) : '')
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Cartão de crédito */}
            <div className="rounded border border-slate-200 bg-slate-50 p-3 space-y-2">
              <p className="text-xs font-bold text-slate-600">Cartão de crédito</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Valor cobrado</label>
                  <Input
                    name="card_price"
                    type="number"
                    step="0.01"
                    required
                    value={cardPrice}
                    placeholder="150.00"
                    icon={<DollarSign size={14} />}
                    onChange={(e) => {
                      setCardPrice(e.target.value)
                      const gross = Number(e.target.value)
                      setCardReceive(gross > 0 ? mpNet(gross, MP_FEES.card1x) : '')
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Você recebe (1x · 4,98%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cardReceive}
                    placeholder="142.53"
                    icon={<DollarSign size={14} />}
                    onChange={(e) => {
                      setCardReceive(e.target.value)
                      const net = Number(e.target.value)
                      setCardPrice(net > 0 ? mpGross(net, MP_FEES.card1x) : '')
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Valor cobrado (12x)</label>
                  <Input
                    name="card12x_price"
                    type="number"
                    step="0.01"
                    required
                    value={cardPrice12x}
                    placeholder="160.00"
                    icon={<DollarSign size={14} />}
                    onChange={(e) => {
                      setCardPrice12x(e.target.value)
                      const gross = Number(e.target.value)
                      setCard12xReceive(gross > 0 ? mpNet(gross, MP_FEES.card12x) : '')
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Você recebe (12x · 6,79%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={card12xReceive}
                    placeholder="149.14"
                    icon={<DollarSign size={14} />}
                    onChange={(e) => {
                      setCard12xReceive(e.target.value)
                      const net = Number(e.target.value)
                      setCardPrice12x(net > 0 ? mpGross(net, MP_FEES.card12x) : '')
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}


        {instructor && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
            <select
              name="active"
              defaultValue={instructor.active ? 'true' : 'false'}
              className="h-11 rounded-sm border border-slate-200 px-3 text-sm text-slate-800 bg-white focus:outline-none focus:border-[var(--primary)]"
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Bio</label>
        <textarea
          name="bio"
          rows={3}
          defaultValue={instructor?.bio ?? ''}
          placeholder="Certificações, experiência e estilo de ensino."
          className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-white resize-none focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10"
        />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500 block mb-2">Cor do avatar</label>
        <div className="flex gap-2 flex-wrap">
          {AVATAR_COLORS.map((avatarColor) => (
            <button
              key={avatarColor}
              type="button"
              onClick={() => setColor(avatarColor)}
              className="w-7 h-7 rounded-full transition-transform hover:scale-110 border-2"
              style={{
                background: avatarColor,
                borderColor: color === avatarColor ? '#0f172a' : 'transparent',
                outline: color === avatarColor ? '2px solid white' : 'none',
                outlineOffset: '-3px',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )

  const availabilitySection = (
    <div className="bg-white border border-slate-200 rounded p-6">
      <h2 className="font-condensed text-base font-bold uppercase text-slate-600 tracking-wide mb-5">
        Disponibilidade
      </h2>

      <div className="space-y-4">
        {WEEKDAYS_PT.map((day, weekday) => (
          <div key={weekday}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{day}</p>
              <button
                type="button"
                onClick={() => toggleAllSlots(weekday)}
                className="text-[11px] font-bold uppercase tracking-wide text-[var(--primary)] hover:underline"
              >
                {(avail[weekday]?.length ?? 0) === TIME_OPTIONS.length ? 'Limpar' : 'Selecionar todos'}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {TIME_OPTIONS.map((slot) => {
                const selected = avail[weekday]?.includes(slot)

                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleSlot(weekday, slot)}
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
  )

  const footer = (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Salvando...' : instructor ? 'Salvar alterações' : 'Criar instrutor'}
        </Button>

        {layout === 'modal' && activeSection === 'profile' && (
          <Button type="button" variant="ghost" onClick={() => setActiveSection('availability')}>
            Ir para horários
          </Button>
        )}

        {layout === 'modal' && activeSection === 'availability' && (
          <Button type="button" variant="ghost" onClick={() => setActiveSection('profile')}>
            Voltar para dados
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (onCancel) {
              onCancel()
              return
            }

            router.back()
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )

  if (layout === 'modal') {
    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded border border-slate-200 bg-white p-3 h-fit">
            <p className="px-2 pb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Configuração
            </p>

            <div className="space-y-2">
              {sections.map((section, index) => {
                const Icon = section.icon
                const active = activeSection === section.key

                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveSection(section.key)}
                    className={`w-full rounded border px-3 py-3 text-left transition-colors ${
                      active
                        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${
                        section.complete ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {section.complete ? <Check size={16} /> : <span className="text-xs font-bold">{index + 1}</span>}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon size={14} className={active ? 'text-[var(--primary)]' : 'text-slate-400'} />
                          <p className="text-sm font-bold text-slate-800">{section.title}</p>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          <div className="space-y-6">
            <div className={activeSection === 'profile' ? 'block' : 'hidden'}>
              {profileSection}
            </div>
            <div className={activeSection === 'availability' ? 'block' : 'hidden'}>
              {availabilitySection}
            </div>
            {footer}
          </div>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="dashboard-form space-y-8">
      {profileSection}
      {availabilitySection}
      {footer}
    </form>
  )
}
