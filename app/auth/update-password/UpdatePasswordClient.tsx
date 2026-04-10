'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, Lock, Waves } from 'lucide-react'
import { updatePassword } from '@/actions/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toaster'
import { createClient } from '@/lib/supabase/client'

export function UpdatePasswordClient() {
  const { error: showError } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [verifyingLink, setVerifyingLink] = useState(true)

  useEffect(() => {
    let active = true

    async function prepareSession() {
      const supabase = createClient()
      const code = searchParams.get('code')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          if (!active) return
          setError('O link de redefinicao e invalido ou expirou. Solicite um novo e-mail.')
          setVerifyingLink(false)
          return
        }

        router.replace('/auth/update-password')
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!active) return

      if (!user) {
        setError('Abra o link recebido por e-mail para redefinir sua senha.')
        setSessionReady(false)
        setVerifyingLink(false)
        return
      }

      setSessionReady(true)
      setVerifyingLink(false)
    }

    prepareSession()

    return () => {
      active = false
    }
  }, [router, searchParams])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sessionReady) return
    setLoading(true)
    setError('')

    const result = await updatePassword(new FormData(event.currentTarget))

    if (result && !result.success) {
      setError(result.error)
      showError('Não foi possível atualizar a senha.', result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-[#0d1b2a] p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] via-[#023e8a] to-[#0077b6] opacity-80" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] h-1/2 bg-[radial-gradient(ellipse,rgba(0,180,216,.25)_0%,transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-2">
          <div className="w-9 h-9 rounded bg-[#0077b6] flex items-center justify-center">
            <Waves size={18} className="text-white" />
          </div>
          <span className="font-condensed text-white text-xl font-bold uppercase tracking-wide">vamosurfar</span>
        </div>

        <div className="relative z-10">
          <h1 className="font-condensed text-4xl font-bold text-white uppercase leading-tight mb-4">
            Defina uma
            <br />
            <span className="text-[#00b4d8]">nova senha</span>
          </h1>
          <p className="text-sm leading-relaxed text-white/70 max-w-md">
            Use uma senha forte para retomar o acesso ao painel da sua escola.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-slate-50 p-6 lg:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded bg-[#0077b6] flex items-center justify-center">
              <Waves size={14} className="text-white" />
            </div>
            <span className="font-condensed text-slate-800 text-lg font-bold uppercase tracking-wide">vamosurfar</span>
          </div>

          <h1 className="font-condensed text-2xl font-bold uppercase text-slate-800 tracking-wide mb-1">
            Nova senha
          </h1>
          <p className="text-slate-400 text-sm mb-7">
            Informe a nova senha da conta. O link do e-mail precisa estar valido e aberto nesta sessao.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Nova senha</label>
              <Input name="password" type="password" required placeholder="Minimo 6 caracteres" icon={<Lock size={14} />} disabled={!sessionReady || verifyingLink || loading} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Confirmar senha</label>
              <Input name="confirm_password" type="password" required placeholder="Repita a nova senha" icon={<Lock size={14} />} disabled={!sessionReady || verifyingLink || loading} />
            </div>

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <Button type="submit" variant="primary" fullWidth disabled={loading || verifyingLink || !sessionReady}>
              {verifyingLink ? 'Validando link...' : loading ? 'Salvando...' : <><span>Atualizar senha</span><ArrowRight size={15} /></>}
            </Button>
          </form>

          <div className="mt-6">
            <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0077b6] hover:underline">
              <ArrowLeft size={15} />
              Voltar para login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
