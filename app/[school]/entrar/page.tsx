'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { completeStudentProfileRegistration, signInStudent, signUpStudent } from '@/actions/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Mail, Lock, User, Phone, ArrowLeft, ArrowRight, AlertTriangle, CalendarDays, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CPF_INPUT_MAX_LENGTH, formatCpf } from '@/lib/cpf'

interface Props {
  params: Promise<{ school: string }>
}

type Mode = 'login' | 'register' | 'complete'

export default function StudentAuthPage({ params: paramsPromise }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [slug, setSlug] = useState('')
  const [schoolId, setSchoolId] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [mode, setMode] = useState<Mode>(resolveMode(searchParams.get('mode')))
  const [next, setNext] = useState(resolveNext(searchParams.get('next')))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cpf, setCpf] = useState('')

  useEffect(() => {
    paramsPromise.then(p => setSlug(p.school))
  }, [paramsPromise])

  useEffect(() => {
    setMode(resolveMode(searchParams.get('mode')))
    setNext(resolveNext(searchParams.get('next')))
  }, [searchParams])

  useEffect(() => {
    if (!slug) return
    const supabase = createClient()
    supabase
      .from('schools')
      .select('id, name')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        if (data) {
          setSchoolId(data.id)
          setSchoolName(data.name)
        }
      })
  }, [slug])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    fd.set('school_id', schoolId)
    fd.set('school_slug', slug)
    fd.set('next', next)

    const action =
      mode === 'login'
        ? signInStudent
        : mode === 'complete'
          ? completeStudentProfileRegistration
          : signUpStudent

    const result = await action(fd)

    if (result && !result.success) {
      setError(result.error)
      setLoading(false)
    }
  }

  const isCompleteMode = mode === 'complete'

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col">
      <div className="h-14 flex items-center px-5 gap-3" style={{ background: 'linear-gradient(135deg,#0d1b2a,var(--primary))' }}>
        <Link href={`/${slug}`} className="text-white/60 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <span className="font-condensed text-white font-bold uppercase tracking-wide text-lg">{schoolName}</span>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {!isCompleteMode && (
            <div className="flex bg-white border border-slate-200 rounded p-1 mb-6">
              {(['register', 'login'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m)
                    setError('')
                    router.replace(`/${slug}/entrar?mode=${m}&next=${next}`)
                  }}
                  className={`flex-1 py-2 text-center font-condensed text-sm font-bold uppercase tracking-wide rounded transition-all ${
                    mode === m ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {m === 'register' ? 'Cadastrar' : 'Entrar'}
                </button>
              ))}
            </div>
          )}

          {isCompleteMode && (
            <div className="mb-5 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex gap-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>Sua conta já existe, mas falta concluir seu cadastro nesta escola.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {(mode === 'register' || mode === 'complete') && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Nome completo *</label>
                <Input name="full_name" required placeholder="Seu nome" icon={<User size={14} />} />
              </div>
            )}

            {mode !== 'complete' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">E-mail *</label>
                <Input name="email" type="email" required placeholder="seu@email.com" icon={<Mail size={14} />} />
              </div>
            )}

            {(mode === 'register' || mode === 'complete') && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Telefone / WhatsApp</label>
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
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Data de nascimento *</label>
                  <Input name="birth_date" type="date" required icon={<CalendarDays size={14} />} />
                </div>
              </div>
            )}

            {mode !== 'complete' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Senha *</label>
                <Input name="password" type="password" required placeholder="••••••••" icon={<Lock size={14} />} />
              </div>
            )}

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <Button
              type="submit"
              fullWidth
              disabled={loading || !schoolId}
              style={{ background: mode === 'login' ? 'var(--primary)' : 'var(--cta)' } as React.CSSProperties}
              className="mt-1"
            >
              {loading
                ? 'Aguarde...'
                : mode === 'register'
                  ? <><span>Criar conta e agendar</span><ArrowRight size={15} /></>
                  : mode === 'complete'
                    ? <><span>Concluir cadastro</span><ArrowRight size={15} /></>
                    : <><span>Entrar</span><ArrowRight size={15} /></>}
            </Button>
          </form>

          {!isCompleteMode && (
            <p className="text-center text-sm text-slate-400 mt-6">
              {mode === 'register' ? 'Já tem conta? ' : 'Não tem conta? '}
              <button
                type="button"
                onClick={() => {
                  const targetMode = mode === 'register' ? 'login' : 'register'
                  setMode(targetMode)
                  setError('')
                  router.replace(`/${slug}/entrar?mode=${targetMode}&next=${next}`)
                }}
                className="font-semibold hover:underline"
                style={{ color: 'var(--primary)' }}
              >
                {mode === 'register' ? 'Fazer login' : 'Cadastre-se grátis'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function resolveMode(value: string | null): Mode {
  if (value === 'login' || value === 'complete') return value
  return 'register'
}

function resolveNext(value: string | null) {
  return value === 'minhas-aulas' ? 'minhas-aulas' : 'agendar'
}
