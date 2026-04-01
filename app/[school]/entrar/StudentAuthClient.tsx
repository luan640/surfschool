'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, User, Phone, ArrowLeft, ArrowRight, AlertTriangle, CalendarDays, CreditCard } from 'lucide-react'
import { completeStudentProfileRegistration, signInStudent, signUpStudent } from '@/actions/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { CPF_INPUT_MAX_LENGTH, formatCpf } from '@/lib/cpf'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 13.074 17.64 10.767 17.64 9.2z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" />
    </svg>
  )
}

type Mode = 'login' | 'register' | 'complete'

export function StudentAuthClient({
  slug,
  schoolId,
  schoolName,
  initialMode,
  initialNext,
}: {
  slug: string
  schoolId: string
  schoolName: string
  initialMode: Mode
  initialNext: 'agendar' | 'minhas-aulas'
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [next, setNext] = useState(initialNext)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cpf, setCpf] = useState('')

  useEffect(() => {
    setMode(resolveMode(searchParams.get('mode')))
    setNext(resolveNext(searchParams.get('next')))
  }, [searchParams])

  async function handleGoogleSignIn() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const callbackNext = encodeURIComponent(`/${slug}/entrar/google-callback?dest=${next}`)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${callbackNext}`,
      },
    })
    if (oauthError) {
      setError('Erro ao conectar com Google. Tente novamente.')
      setLoading(false)
    }
  }

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
              <p>Sua conta jÃ¡ existe, mas falta concluir seu cadastro nesta escola.</p>
            </div>
          )}

          {!isCompleteMode && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || !schoolId}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GoogleIcon />
                Continuar com Google
              </button>
              <div className="relative flex items-center">
                <div className="flex-1 border-t border-slate-200" />
                <span className="px-3 text-xs text-slate-400 uppercase font-medium">ou</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>
            </>
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
                <Input name="password" type="password" required placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" icon={<Lock size={14} />} />
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
              {mode === 'register' ? 'JÃ¡ tem conta? ' : 'NÃ£o tem conta? '}
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
                {mode === 'register' ? 'Fazer login' : 'Cadastre-se grÃ¡tis'}
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

function resolveNext(value: string | null): 'agendar' | 'minhas-aulas' {
  return value === 'minhas-aulas' ? 'minhas-aulas' : 'agendar'
}
