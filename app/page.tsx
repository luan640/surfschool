import Link from 'next/link'
import { ArrowRight, BarChart3, Calendar, Shield, Star, Users, Waves } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0077b6]">
            <Waves size={15} className="text-white" />
          </div>
          <span className="font-condensed text-xl font-bold uppercase tracking-wide text-slate-800">vamosurfar</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-800">
            Entrar
          </Link>
          <Link
            href="/auth/register"
            className="flex items-center gap-2 rounded bg-[#0077b6] px-5 py-2 text-sm font-condensed font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#005f8e]"
          >
            Comecar gratis <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#0d1b2a] via-[#023e8a] to-[#0077b6] px-6 py-24 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(0,180,216,.2)_0%,transparent_70%)]" />
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white/90">
            <Star size={12} className="fill-amber-400 text-amber-400" /> Plataforma #1 para Escolas de Surf
          </div>
          <h1 className="mb-6 font-condensed text-5xl font-bold uppercase leading-[.9] tracking-wide text-white md:text-7xl">
            Sua escola de surf
            <br />
            <span className="text-[#00b4d8]">no digital</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-white/70">
            Plataforma completa para escolas de surf. Agenda online, gestao de instrutores, dashboard financeiro e link personalizado para seus alunos.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/register"
              className="flex items-center justify-center gap-2 rounded bg-[#f77f00] px-10 py-4 text-base font-condensed font-bold uppercase tracking-wide text-white shadow-[0_4px_18px_rgba(247,127,0,.4)] transition-colors hover:bg-[#e06500]"
            >
              <ArrowRight size={18} /> Cadastrar minha escola gratis
            </Link>
            <Link
              href="/auth/login"
              className="flex items-center justify-center gap-2 rounded border-2 border-white/40 px-10 py-4 text-base font-condensed font-bold uppercase tracking-wide text-white transition-colors hover:bg-white/10"
            >
              Ver demo
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="mb-3 text-center font-condensed text-4xl font-bold uppercase tracking-wide text-slate-800">
          Tudo que sua escola precisa
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-slate-400">
          Concentre-se no surf. Deixe a tecnologia cuidar do resto.
        </p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: <Calendar size={22} />, title: 'Agenda Online', desc: 'Alunos escolhem dia, instrutor e horario pelo link da sua escola. Zero ligacoes.' },
            { icon: <Users size={22} />, title: 'Gestao de Instrutores', desc: 'Cadastre fotos, precos, disponibilidade e especialidades de cada instrutor.' },
            { icon: <BarChart3 size={22} />, title: 'Dashboard Financeiro', desc: 'Acompanhe faturamento, ranking de instrutores e metricas da escola em tempo real.' },
            { icon: <Waves size={22} />, title: 'Multi-escola', desc: 'Cada escola tem seu proprio link personalizado. Totalmente independente.' },
            { icon: <Shield size={22} />, title: 'Pagamento Seguro', desc: 'PIX e cartao de credito integrados. Receba antes da aula.' },
            { icon: <Star size={22} />, title: 'Link Proprio', desc: 'Compartilhe vamosurfar.app/suaescola nas redes sociais e no WhatsApp.' },
          ].map((feature) => (
            <div key={feature.title} className="rounded border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded bg-[#0077b6]/10 text-[#0077b6]">
                {feature.icon}
              </div>
              <h3 className="mb-2 font-condensed text-lg font-bold uppercase tracking-wide text-slate-800">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#0d1b2a] px-6 py-20 text-center">
        <h2 className="mb-4 font-condensed text-4xl font-bold uppercase tracking-wide text-white">
          Pronto para comecar?
        </h2>
        <p className="mx-auto mb-8 max-w-md text-white/60">Cadastre sua escola em minutos. Gratis para sempre no plano basico.</p>
        <Link
          href="/auth/register"
          className="inline-flex items-center gap-2 rounded bg-[#f77f00] px-10 py-4 text-base font-condensed font-bold uppercase tracking-wide text-white shadow-[0_4px_18px_rgba(247,127,0,.4)] transition-colors hover:bg-[#e06500]"
        >
          <ArrowRight size={18} /> Cadastrar minha escola gratis
        </Link>
      </section>

      <footer className="flex items-center justify-between border-t border-slate-100 px-6 py-6 text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <Waves size={14} className="text-[#0077b6]" />
          <span className="font-condensed font-bold uppercase tracking-wide text-slate-600">vamosurfar</span>
        </div>
        <p>© 2025 vamosurfar. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
