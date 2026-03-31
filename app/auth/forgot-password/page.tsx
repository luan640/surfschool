'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Mail, Waves } from 'lucide-react'
import { sendPasswordResetEmail } from '@/actions/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toaster'

export default function ForgotPasswordPage() {
  const { error: showError, success } = useToast()
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(event.currentTarget)
    const result = await sendPasswordResetEmail(formData)

    if (result && !result.success) {
      setError(result.error)
      showError('Nao foi possivel enviar o link.', result.error)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
    success('Link de redefinicao enviado.')
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
            Recupere o acesso
            <br />
            <span className="text-[#00b4d8]">da sua escola</span>
          </h1>
          <p className="text-sm leading-relaxed text-white/70 max-w-md">
            Envie um link de redefinicao para o seu e-mail e crie uma nova senha com seguranca.
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
            Esqueci minha senha
          </h1>
          <p className="text-slate-400 text-sm mb-7">
            Digite o e-mail da conta proprietaria para receber o link de redefinicao.
          </p>

          {sent ? (
            <div className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Se existir uma conta para esse e-mail, enviamos o link de redefinicao. Verifique sua caixa de entrada.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">E-mail</label>
                <Input name="email" type="email" required placeholder="seu@email.com" icon={<Mail size={14} />} />
              </div>

              {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

              <Button type="submit" variant="primary" fullWidth disabled={loading}>
                {loading ? 'Enviando...' : <><span>Enviar link</span><ArrowRight size={15} /></>}
              </Button>
            </form>
          )}

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
