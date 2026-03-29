import Link from 'next/link'
import { Waves, BarChart3, Users, Calendar, Shield, ArrowRight, Star } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#0077b6] flex items-center justify-center">
            <Waves size={15} className="text-white" />
          </div>
          <span className="font-condensed text-xl font-bold uppercase tracking-wide text-slate-800">SurfBook</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">
            Entrar
          </Link>
          <Link href="/auth/register"
            className="font-condensed font-bold uppercase tracking-wide text-white bg-[#0077b6] rounded px-5 py-2 text-sm hover:bg-[#005f8e] transition-colors flex items-center gap-2">
            Começar grátis <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0d1b2a] via-[#023e8a] to-[#0077b6] px-6 py-24 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(0,180,216,.2)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white/90 text-xs font-bold uppercase tracking-wide mb-6">
            <Star size={12} className="fill-amber-400 text-amber-400" /> Plataforma #1 para Escolas de Surf
          </div>
          <h1 className="font-condensed text-5xl md:text-7xl font-bold text-white uppercase leading-[.9] tracking-wide mb-6">
            Sua escola de surf<br /><span className="text-[#00b4d8]">no digital</span>
          </h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto leading-relaxed mb-10">
            Plataforma completa para escolas de surf. Agenda online, gestão de instrutores, dashboard financeiro e link personalizado para seus alunos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register"
              className="font-condensed font-bold uppercase tracking-wide text-white bg-[#f77f00] rounded px-10 py-4 text-base hover:bg-[#e06500] transition-colors flex items-center justify-center gap-2 shadow-[0_4px_18px_rgba(247,127,0,.4)]">
              <ArrowRight size={18} /> Cadastrar minha escola grátis
            </Link>
            <Link href="/auth/login"
              className="font-condensed font-bold uppercase tracking-wide text-white border-2 border-white/40 rounded px-10 py-4 text-base hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
              Ver demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="font-condensed text-4xl font-bold uppercase text-slate-800 text-center tracking-wide mb-3">
          Tudo que sua escola precisa
        </h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          Concentre-se no surf. Deixe a tecnologia cuidar do resto.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: <Calendar size={22} />, title: 'Agenda Online', desc: 'Alunos escolhem dia, instrutor e horário pelo link da sua escola. Zero ligações.' },
            { icon: <Users size={22} />, title: 'Gestão de Instrutores', desc: 'Cadastre fotos, preços, disponibilidade e especialidades de cada instrutor.' },
            { icon: <BarChart3 size={22} />, title: 'Dashboard Financeiro', desc: 'Acompanhe faturamento, ranking de instrutores e métricas da escola em tempo real.' },
            { icon: <Waves size={22} />, title: 'Multi-escola', desc: 'Cada escola tem seu próprio link personalizado. Totalmente independente.' },
            { icon: <Shield size={22} />, title: 'Pagamento Seguro', desc: 'PIX e cartão de crédito integrados. Receba antes da aula.' },
            { icon: <Star size={22} />, title: 'Link Próprio', desc: 'Compartilhe surfbook.app/suaescola nas redes sociais e no WhatsApp.' },
          ].map(f => (
            <div key={f.title} className="bg-white border border-slate-200 rounded p-6 hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded bg-[#0077b6]/10 flex items-center justify-center text-[#0077b6] mb-4">
                {f.icon}
              </div>
              <h3 className="font-condensed font-bold uppercase text-slate-800 text-lg tracking-wide mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0d1b2a] px-6 py-20 text-center">
        <h2 className="font-condensed text-4xl font-bold text-white uppercase tracking-wide mb-4">
          Pronto para começar?
        </h2>
        <p className="text-white/60 mb-8 max-w-md mx-auto">Cadastre sua escola em minutos. Grátis para sempre no plano básico.</p>
        <Link href="/auth/register"
          className="inline-flex items-center gap-2 font-condensed font-bold uppercase tracking-wide text-white bg-[#f77f00] rounded px-10 py-4 text-base hover:bg-[#e06500] transition-colors shadow-[0_4px_18px_rgba(247,127,0,.4)]">
          <ArrowRight size={18} /> Cadastrar minha escola grátis
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 px-6 py-6 flex items-center justify-between text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <Waves size={14} className="text-[#0077b6]" />
          <span className="font-condensed font-bold uppercase tracking-wide text-slate-600">SurfBook</span>
        </div>
        <p>© 2025 SurfBook. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}
