'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { completeOwnerSchoolRegistration, signUpOwner } from '@/actions/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toaster'
import { Mail, Lock, User, Building2, Phone, Waves, ArrowRight, AlertTriangle } from 'lucide-react'
import registerImage from '../../../img_lp/pexels-renestrgar-18338691.jpg'

type RegisterMode = 'signup' | 'complete'

export function OwnerRegisterForm({ mode }: { mode: RegisterMode }) {
  const { error: showError, success } = useToast()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const action = mode === 'complete' ? completeOwnerSchoolRegistration : signUpOwner
    const result = await action(new FormData(e.currentTarget))

    if (result && !result.success) {
      setError(result.error)
      showError(isCompleteMode ? 'Não foi possível concluir o cadastro da escola.' : 'Não foi possível criar a conta.', result.error)
      setLoading(false)
      return
    }

    if (isCompleteMode) {
      success('Cadastro da escola concluido com sucesso.')
    }
  }

  const isCompleteMode = mode === 'complete'

  return (
    <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-[#0d1b2a] p-12 relative overflow-hidden">
        <Image
          src={registerImage}
          alt="Surfista no mar"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] h-1/2 bg-[radial-gradient(ellipse,rgba(0,180,216,.25)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded bg-[#0077b6] flex items-center justify-center">
              <Waves size={18} className="text-white" />
            </div>
            <span className="font-condensed text-white text-xl font-bold uppercase tracking-wide">vamosurfar</span>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="font-condensed text-4xl font-bold text-white uppercase leading-tight mb-3">
            {isCompleteMode ? 'Conclua o cadastro da sua escola.' : <>Comece grátis.<br /><span className="text-[#00b4d8]">Cresça</span> sem limites.</>}
          </h2>
          <p className="text-white/60 text-sm leading-relaxed">
            {isCompleteMode
              ? 'Sua conta foi criada, mas faltou registrar a escola. Finalize isso para acessar o dashboard.'
              : 'Cadastre sua escola em minutos. Seus alunos já podem agendar aulas pelo link personalizado.'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-slate-50 p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded bg-[#0077b6] flex items-center justify-center">
              <Waves size={14} className="text-white" />
            </div>
            <span className="font-condensed text-slate-800 text-lg font-bold uppercase tracking-wide">vamosurfar</span>
          </div>

          <h1 className="font-condensed text-2xl font-bold uppercase text-slate-800 tracking-wide mb-1">
            {isCompleteMode ? 'Finalizar cadastro' : 'Cadastrar escola'}
          </h1>
          <p className="text-slate-400 text-sm mb-7">
            {isCompleteMode ? 'Informe os dados da escola para liberar seu painel.' : 'Crie a conta do proprietário e da escola.'}
          </p>

          {isCompleteMode && (
            <div className="mb-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex gap-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>Sua conta já existe. Esta etapa vai apenas criar o registro da escola que ficou pendente.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isCompleteMode && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Seu nome *</label>
                <Input name="name" required placeholder="Nome completo" icon={<User size={14} />} />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Nome da escola *</label>
              <Input name="school_name" required placeholder="AprimoreSurf" icon={<Building2 size={14} />} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Telefone</label>
              <Input name="phone" type="tel" placeholder="(48) 9 9999-0000" icon={<Phone size={14} />} />
            </div>

            {!isCompleteMode && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">E-mail *</label>
                  <Input name="email" type="email" required placeholder="seu@email.com" icon={<Mail size={14} />} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Senha *</label>
                  <Input name="password" type="password" required placeholder="Mínimo 6 caracteres" icon={<Lock size={14} />} />
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <Button type="submit" variant="cta" fullWidth disabled={loading} className="mt-1">
              {loading
                ? (isCompleteMode ? 'Finalizando...' : 'Criando conta...')
                : <><span>{isCompleteMode ? 'Concluir cadastro da escola' : 'Criar conta grátis'}</span><ArrowRight size={15} /></>}
            </Button>
          </form>

          {!isCompleteMode && (
            <p className="text-center text-sm text-slate-400 mt-6">
              Já tem conta?{' '}
              <Link href="/auth/login" className="text-[#0077b6] font-semibold hover:underline">
                Fazer login
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
