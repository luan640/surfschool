import Link from 'next/link'
import { MailCheck, Waves } from 'lucide-react'
import { ResendConfirmationForm } from '@/components/auth/ResendConfirmationForm'

interface Props {
  searchParams?: Promise<{ email?: string }>
}

export default async function RegisterSuccessPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : undefined
  const email = params?.email ? decodeURIComponent(params.email) : ''

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#0d1b2a] p-12 lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] via-[#023e8a] to-[#0077b6] opacity-80" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-1/2 w-[140%] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(0,180,216,.25)_0%,transparent_70%)]" />

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-[#0077b6]">
              <Waves size={18} className="text-white" />
            </div>
            <span className="font-condensed text-xl font-bold uppercase tracking-wide text-white">vamosurfar</span>
          </div>
        </div>

        <div className="relative z-10">
          <h1 className="mb-3 font-condensed text-4xl font-bold uppercase leading-tight text-white">
            Conta criada.
            <br />
            <span className="text-[#00b4d8]">Falta confirmar seu e-mail.</span>
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-white/70">
            Enviamos a confirmacao para o e-mail informado. Assim que voce validar a conta, o acesso ao painel fica liberado.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-slate-50 p-6 lg:p-12">
        <div className="w-full max-w-md rounded border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#0077b6]">
              <Waves size={14} className="text-white" />
            </div>
            <span className="font-condensed text-lg font-bold uppercase tracking-wide text-slate-800">vamosurfar</span>
          </div>

          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <MailCheck size={24} />
          </div>

          <h2 className="font-condensed text-2xl font-bold uppercase tracking-wide text-slate-800">
            Verifique seu e-mail
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Enviamos um e-mail de confirmação para {email ? <strong className="text-slate-700">{email}</strong> : 'o endereco informado'}.
            Clique no link de confirmação antes de fazer login.
          </p>

          <div className="mt-6 rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Se não encontrar a mensagem, verifique também a caixa de spam ou lixo eletrônico.
          </div>

          <ResendConfirmationForm email={email} initialCooldownSeconds={60} hideEmailField />

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/auth/login"
              className="inline-flex h-11 items-center justify-center rounded bg-[#0077b6] px-4 text-sm font-bold uppercase text-white transition-colors hover:bg-[#00679a]"
            >
              Ir para login
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex h-11 items-center justify-center rounded border border-slate-200 px-4 text-sm font-bold uppercase text-slate-700 transition-colors hover:bg-slate-50"
            >
              Voltar ao cadastro
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
