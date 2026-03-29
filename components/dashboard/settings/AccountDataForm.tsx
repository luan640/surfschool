'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { Building2, ImageUp, MapPin, Phone } from 'lucide-react'
import { Banner } from '@/components/dashboard/settings/SettingsStatus'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toaster'
import type { School } from '@/lib/types'

interface Props {
  school: School
  status?: string
  action: (formData: FormData) => void
}

const MAX_LOGO_SIZE = 2 * 1024 * 1024

export function AccountDataForm({ school, status, action }: Props) {
  const [logoError, setLogoError] = useState('')
  const { success, error: showError } = useToast()

  useEffect(() => {
    if (status === 'saved') {
      success('Dados da conta atualizados com sucesso.')
    }
    if (status === 'error') {
      showError('Nao foi possivel salvar os dados da conta.')
    }
  }, [showError, status, success])

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      setLogoError('')
      return
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      event.target.value = ''
      setLogoError('Use apenas arquivos JPG, PNG, WEBP ou SVG.')
      return
    }

    if (file.size > MAX_LOGO_SIZE) {
      event.target.value = ''
      setLogoError('A logo deve ter no maximo 2 MB.')
      return
    }

    setLogoError('')
  }

  return (
    <div className="dashboard-page-compact">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Dados da conta
        </h1>
        <p className="mt-1 text-sm text-slate-400">Atualize os dados principais da escola, contatos e identidade visual.</p>
      </div>

      {status === 'saved' && <Banner tone="success" text="Dados da conta atualizados com sucesso." />}
      {status === 'error' && <Banner tone="error" text="Nao foi possivel salvar os dados da conta." />}

      <form action={action} className="space-y-6">
        <div className="space-y-4 rounded border border-slate-200 bg-white p-6">
          <div>
            <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Escola</h2>
            <p className="mt-1 text-sm text-slate-500">Informacoes exibidas para os alunos no site de agendamento.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Nome da escola *</label>
              <Input name="name" required defaultValue={school.name} placeholder="AprimoreSurf" icon={<Building2 size={14} />} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Tagline</label>
              <Input name="tagline" defaultValue={school.tagline ?? ''} placeholder="Metodo WSL - Florianopolis, SC" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Telefone</label>
              <Input name="phone" type="tel" defaultValue={school.phone ?? ''} placeholder="(48) 3333-0000" icon={<Phone size={14} />} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">WhatsApp</label>
              <Input name="whatsapp" type="tel" defaultValue={school.whatsapp ?? ''} placeholder="(48) 9 9999-0000" icon={<Phone size={14} />} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Endereco</label>
            <Input name="address" defaultValue={school.address ?? ''} placeholder="Rua da Praia, 100 - Florianopolis, SC" icon={<MapPin size={14} />} />
          </div>
        </div>

        <div className="space-y-4 rounded border border-slate-200 bg-white p-6">
          <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Identidade visual</h2>
          <div className="grid gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Logo da escola</label>
            <div className="flex flex-col gap-4 rounded border border-dashed border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                {school.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={school.logo_url} alt={`Logo da ${school.name}`} className="h-full w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <ImageUp size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Sem logo</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  name="logo_file"
                  accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:font-bold file:uppercase file:text-white"
                />
                <p className="mt-2 text-xs text-slate-400">JPG, PNG, WEBP ou SVG com ate 2 MB.</p>
                {logoError && <p className="mt-2 text-sm font-medium text-rose-600">{logoError}</p>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Cor primaria</label>
              <div className="flex items-center gap-3">
                <input type="color" name="primary_color" defaultValue={school.primary_color} className="h-11 w-11 cursor-pointer rounded border border-slate-200 p-0.5" />
                <span className="font-mono text-sm text-slate-500">{school.primary_color}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Header, botoes e links</p>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Cor de destaque</label>
              <div className="flex items-center gap-3">
                <input type="color" name="cta_color" defaultValue={school.cta_color} className="h-11 w-11 cursor-pointer rounded border border-slate-200 p-0.5" />
                <span className="font-mono text-sm text-slate-500">{school.cta_color}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Botao principal de acao</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" variant="primary">Salvar configurações</Button>
        </div>
      </form>
    </div>
  )
}
