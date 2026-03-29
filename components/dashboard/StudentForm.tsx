'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, CreditCard, Lock, Mail, Phone, User } from 'lucide-react'
import { createDashboardStudent } from '@/actions/students'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toaster'
import { formatCpf, CPF_INPUT_MAX_LENGTH } from '@/lib/cpf'

interface Props {
  onSuccess?: () => void
  onCancel?: () => void
}

export function StudentForm({ onSuccess, onCancel }: Props) {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cpf, setCpf] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(event.currentTarget)
    const result = await createDashboardStudent(formData)

    if (!result.success) {
      setError(result.error)
      showError('Nao foi possivel cadastrar o aluno.', result.error)
      setLoading(false)
      return
    }

    success('Aluno cadastrado com sucesso.')

    if (onSuccess) {
      onSuccess()
      router.refresh()
      return
    }

    router.push('/dashboard/students')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4 rounded border border-slate-200 bg-white p-6">
        <div>
          <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">Dados do aluno</h2>
          <p className="mt-1 text-sm text-slate-500">Crie o acesso do aluno e vincule o perfil dele a esta escola.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Nome completo *</label>
            <Input name="full_name" required placeholder="Nome do aluno" icon={<User size={14} />} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">E-mail *</label>
            <Input name="email" type="email" required placeholder="aluno@email.com" icon={<Mail size={14} />} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Telefone</label>
            <Input name="phone" type="tel" placeholder="(48) 9 9999-0000" icon={<Phone size={14} />} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">CPF *</label>
            <Input
              name="cpf"
              required
              value={cpf}
              onChange={(event) => setCpf(formatCpf(event.target.value))}
              maxLength={CPF_INPUT_MAX_LENGTH}
              placeholder="000.000.000-00"
              icon={<CreditCard size={14} />}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Data de nascimento *</label>
            <Input name="birth_date" type="date" required icon={<CalendarDays size={14} />} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Senha inicial *</label>
            <Input name="password" type="password" required placeholder="Minimo de 6 caracteres" icon={<Lock size={14} />} />
          </div>
        </div>

        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          O aluno podera entrar com esse e-mail e senha na area publica da escola.
        </div>
      </div>

      {error && <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="flex justify-end gap-3">
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Salvando...' : 'Cadastrar aluno'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (onCancel) {
              onCancel()
              return
            }

            router.push('/dashboard/students')
          }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
