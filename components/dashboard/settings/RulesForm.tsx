'use client'

import { useEffect } from 'react'
import { Clock3, ShieldCheck, TimerReset } from 'lucide-react'
import type { SchoolRules } from '@/lib/types'
import { Banner } from '@/components/dashboard/settings/SettingsStatus'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toaster'

interface Props {
  rules: SchoolRules
  status?: string
  action: (formData: FormData) => void
}

function ToggleField({
  name,
  title,
  description,
  defaultChecked,
}: {
  name: string
  title: string
  description: string
  defaultChecked: boolean
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded border border-slate-200 bg-slate-50 p-4">
      <div>
        <div className="text-sm font-semibold text-slate-700">{title}</div>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <span className="relative mt-1 inline-flex shrink-0 items-center">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-[var(--primary)]" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

export function RulesForm({ rules, status, action }: Props) {
  const { success, error: showError } = useToast()

  useEffect(() => {
    if (status === 'saved') {
      success('Regras atualizadas com sucesso.')
    }
    if (status === 'error') {
      showError('Não foi possível salvar as regras da escola.')
    }
  }, [showError, status, success])

  return (
    <div className="dashboard-page-compact">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
          Regras
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Defina como a escola lida com cancelamentos, reagendamentos e limites de agendamento.
        </p>
      </div>

      {status === 'saved' && <Banner tone="success" text="Regras atualizadas com sucesso." />}
      {status === 'error' && <Banner tone="error" text="Não foi possível salvar as regras da escola." />}

      <form action={action} className="space-y-6">
        <section className="space-y-4 rounded border border-slate-200 bg-white p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-[var(--primary)]/10 p-2 text-[var(--primary)]">
              <ShieldCheck size={16} />
            </div>
            <div>
              <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">
                Cancelamentos e reagendamentos
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Controle se o aluno pode alterar a agenda sem falar com a escola e com quanta antecedencia.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <ToggleField
              name="allow_student_cancellation"
              title="Permitir cancelamento pelo aluno"
              description="Quando desligado, o aluno precisa falar com a escola para cancelar uma aula."
              defaultChecked={rules.allow_student_cancellation}
            />
            <div className="grid gap-1.5 sm:max-w-xs">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Horas minimas para cancelar
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                name="cancellation_notice_hours"
                defaultValue={rules.cancellation_notice_hours}
                icon={<Clock3 size={14} />}
              />
            </div>

          </div>
        </section>

        <section className="space-y-4 rounded border border-slate-200 bg-white p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-[var(--cta)]/10 p-2 text-[var(--cta)]">
              <TimerReset size={16} />
            </div>
            <div>
              <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">
                Janela de agendamento
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Defina o quanto antes um aluno pode reservar e ate quantos dias no futuro a agenda fica aberta.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Horas minimas antes da aula
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                name="minimum_booking_notice_hours"
                defaultValue={rules.minimum_booking_notice_hours}
                icon={<Clock3 size={14} />}
              />
              <p className="text-xs text-slate-400">Exemplo: `2` impede reservas em cima da hora.</p>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Dias maximos no futuro
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                name="booking_window_days"
                defaultValue={rules.booking_window_days}
                icon={<TimerReset size={14} />}
              />
              <p className="text-xs text-slate-400">Exemplo: `90` abre os proximos 3 meses de agenda.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded border border-slate-200 bg-white p-6">
          <div>
            <h2 className="font-condensed text-base font-bold uppercase tracking-wide text-slate-600">
              Aula experimental
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Libere uma aula experimental gratuita para alunos que ainda nao fizeram nenhuma reserva nesta escola.
            </p>
          </div>

          <ToggleField
            name="trial_lesson_enabled"
            title="Ativar aula experimental"
            description="Quando ligado, o aluno pode ver a opcao Aula experimental com valor R$ 0,00 na primeira reserva."
            defaultChecked={rules.trial_lesson_enabled}
          />
        </section>

        <div className="flex justify-end gap-3">
          <Button type="submit" variant="primary">Salvar regras</Button>
        </div>
      </form>
    </div>
  )
}
