'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signInOwner } from '@/actions/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toaster'
import { Mail, Lock, Waves, ArrowRight } from 'lucide-react'

export default function OwnerLoginPage() {
  const { error: showError } = useToast()
  const [urlError, setUrlError] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setUrlError(params.get('error'))
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signInOwner(new FormData(e.currentTarget))
    if (result && !result.success) {
      setError(result.error)
      showError('Nao foi possivel entrar.', result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-2">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between bg-[#0d1b2a] p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] via-[#023e8a] to-[#0077b6] opacity-80" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] h-1/2
          bg-[radial-gradient(ellipse,rgba(0,180,216,.25)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded bg-[#0077b6] flex items-center justify-center">
              <Waves size={18} className="text-white" />
            </div>
            <span className="font-condensed text-white text-xl font-bold uppercase tracking-wide">SurfBook</span>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="font-condensed text-4xl font-bold text-white uppercase leading-tight mb-4">
            Gerencie sua<br /><span className="text-[#00b4d8]">escola de surf</span><br />com facilidade
          </h2>
          <div className="flex flex-col gap-3">
            {['Agenda online para alunos', 'Dashboard com métricas em tempo real', 'Gestão completa de instrutores'].map(f => (
              <div key={f} className="flex items-center gap-3 text-white/70 text-sm">
                <div className="w-5 h-5 rounded-full bg-[#0077b6]/40 flex items-center justify-center shrink-0">
                  <span className="text-[#00b4d8] text-[10px] font-bold">✓</span>
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center bg-slate-50 p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded bg-[#0077b6] flex items-center justify-center">
              <Waves size={14} className="text-white" />
            </div>
            <span className="font-condensed text-slate-800 text-lg font-bold uppercase tracking-wide">SurfBook</span>
          </div>

          <h1 className="font-condensed text-2xl font-bold uppercase text-slate-800 tracking-wide mb-1">
            Entrar
          </h1>
          <p className="text-slate-400 text-sm mb-7">Acesse o painel da sua escola.</p>

          {urlError && !error && (
            <p className="mb-4 text-sm font-medium text-red-500">
              {urlError === 'confirmation_failed'
                ? 'Nao foi possivel confirmar seu e-mail automaticamente. Tente abrir o link novamente.'
                : urlError === 'missing_code'
                  ? 'Link de confirmacao invalido.'
                  : 'Nao foi possivel concluir a autenticacao.'}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">E-mail</label>
              <Input name="email" type="email" required placeholder="seu@email.com" icon={<Mail size={14} />} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Senha</label>
              <Input name="password" type="password" required placeholder="••••••••" icon={<Lock size={14} />} />
            </div>

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <Button type="submit" variant="primary" fullWidth disabled={loading} className="mt-1">
              {loading ? 'Entrando...' : <><span>Entrar</span><ArrowRight size={15} /></>}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Não tem conta?{' '}
            <Link href="/auth/register" className="text-[#0077b6] font-semibold hover:underline">
              Cadastre sua escola
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
