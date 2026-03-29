import Link from 'next/link'
import { CheckCircle2, Waves } from 'lucide-react'

export default function AuthConfirmedPage() {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#0d1b2a] p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b2a] via-[#023e8a] to-[#0077b6] opacity-80" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-1/2 w-[140%] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(0,180,216,.25)_0%,transparent_70%)]" />

        <div className="relative z-10 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-[#0077b6]">
            <Waves size={18} className="text-white" />
          </div>
          <span className="font-condensed text-xl font-bold uppercase tracking-wide text-white">SurfBook</span>
        </div>

        <div className="relative z-10">
          <h1 className="mb-3 font-condensed text-4xl font-bold uppercase leading-tight text-white">
            E-mail confirmado.
            <br />
            <span className="text-[#00b4d8]">Sua conta ja esta ativa.</span>
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-white/70">
            Agora voce pode entrar na plataforma e continuar a configuracao da sua escola.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-slate-50 p-6 lg:p-12">
        <div className="w-full max-w-md rounded border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-[#0077b6]">
              <Waves size={14} className="text-white" />
            </div>
            <span className="font-condensed text-lg font-bold uppercase tracking-wide text-slate-800">SurfBook</span>
          </div>

          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>

          <h2 className="font-condensed text-2xl font-bold uppercase tracking-wide text-slate-800">
            Confirmacao concluida
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Seu e-mail foi confirmado com sucesso. Entre agora para acessar o painel ou concluir o cadastro que estiver pendente.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/dashboard/overview"
              className="inline-flex h-11 items-center justify-center rounded bg-[#0077b6] px-4 text-sm font-bold uppercase text-white transition-colors hover:bg-[#00679a]"
            >
              Ir para o painel
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-11 items-center justify-center rounded border border-slate-200 px-4 text-sm font-bold uppercase text-slate-700 transition-colors hover:bg-slate-50"
            >
              Entrar manualmente
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
