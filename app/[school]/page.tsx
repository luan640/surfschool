import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getInstructorsBySchoolSlug } from '@/actions/instructors'
import { formatPrice, initials } from '@/lib/utils'
import { Star, Calendar, Shield, ArrowRight, Waves, MapPin } from 'lucide-react'

export default async function SchoolLandingPage({ params }: { params: Promise<{ school: string }> }) {
  const { school: slug } = await params
  const supabase = await createClient()

  const { data: school } = await supabase
    .from('schools')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!school) notFound()

  const instructors = await getInstructorsBySchoolSlug(slug)

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'linear-gradient(155deg,#0d1b2a 0%,#023e8a 45%,var(--primary) 78%,var(--primary-light) 100%)' }}>
      {/* BG decoration */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute bottom-[-25%] left-1/2 -translate-x-1/2 w-[140%] h-[55%]
          bg-[radial-gradient(ellipse,rgba(0,180,216,.25)_0%,transparent_70%)]" />
        <div className="absolute top-[-15%] right-[-15%] w-[55%] h-[55%] rounded-full
          bg-[radial-gradient(ellipse,rgba(2,62,138,.5)_0%,transparent_70%)]" />
      </div>

      {/* Wave */}
      <div className="fixed bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-16 sm:h-20">
          <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,30 1440,40 L1440,80 L0,80Z" fill="rgba(248,250,252,0.05)" />
        </svg>
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-white/15 flex items-center justify-center">
            <Waves size={15} className="text-white" />
          </div>
          <span className="font-condensed text-white text-xl font-bold uppercase tracking-wide">{school.name}</span>
        </div>
        <Link
          href={`/${slug}/entrar?mode=login&next=minhas-aulas`}
          className="text-white/75 border border-white/25 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide hover:bg-white/10 transition-colors"
        >
          Já tenho conta
        </Link>
      </header>

      {/* Hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pb-20 pt-8">
        <h1 className="font-condensed font-bold text-white uppercase leading-[.92] tracking-wide mb-5"
          style={{ fontSize: 'clamp(2.6rem, 9vw, 5.5rem)' }}>
          Seja bem-vindo a {school.name}.<br /><span style={{ color: 'var(--primary-light)' }}></span>
        </h1>

        <p className="text-white/65 max-w-2xl leading-relaxed mb-4 text-sm md:text-base">
          {school.tagline
            ? `${school.tagline} Agende online com instrutores experientes e encontre o melhor horario para entrar no mar.`
            : `Escolha seu instrutor, reserve online em poucos passos e viva a experiencia de surfar com quem entende de onda de verdade.`}
        </p>
        {school.address && (
          <p className="flex items-center gap-1.5 text-white/50 text-sm mb-8">
            <MapPin size={13} /> {school.address}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <Link href={`/${slug}/entrar?next=agendar`}
            className="inline-flex items-center justify-center gap-2 font-condensed font-bold uppercase tracking-wide text-white rounded px-8 py-4 transition-all hover:-translate-y-px active:scale-[.97]"
            style={{ background: 'var(--cta)', boxShadow: '0 4px 18px rgba(247,127,0,.4)' }}>
            <ArrowRight size={17} /> Agendar minha aula
          </Link>
          <Link href={`/${slug}/entrar?mode=login&next=minhas-aulas`}
            className="inline-flex items-center justify-center gap-2 font-condensed font-bold uppercase tracking-wide text-white rounded px-8 py-4 border-2 border-white/40 hover:bg-white/10 transition-colors">
            Entrar
          </Link>
        </div>

        {/* Trust chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { icon: <Calendar size={12} />, label: `${instructors.length} Instrutores` },
            { icon: <Shield size={12} />, label: 'Pagamento seguro' },
          ].map(c => (
            <div key={c.label} className="inline-flex items-center gap-1.5 bg-white/8 border border-white/12 rounded-full px-3.5 py-1.5 text-white/75 text-xs font-semibold backdrop-blur-sm">
              {c.icon} {c.label}
            </div>
          ))}
        </div>
      </div>

      {/* Instructors preview */}
      {instructors.length > 0 && (
        <div className="relative z-10 px-6 pb-24 max-w-4xl mx-auto w-full">
          <h2 className="font-condensed text-white/80 uppercase text-lg font-bold tracking-wide text-center mb-5">
            Nossos Instrutores
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {instructors.map(i => (
              <div key={i.id} className="bg-white/8 border border-white/12 rounded backdrop-blur-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  {i.photo_url ? (
                    <img src={i.photo_url} alt={i.full_name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-condensed font-bold text-sm shrink-0"
                      style={{ background: i.color }}>
                      {initials(i.full_name)}
                    </div>
                  )}
                  <div>
                    <p className="font-condensed font-bold text-white uppercase text-sm">{i.full_name}</p>
                    {i.specialty && <p className="text-white/50 text-xs">{i.specialty}</p>}
                  </div>
                </div>
                <div className="font-condensed text-lg font-bold" style={{ color: 'var(--primary-light)' }}>
                  {formatPrice(i.hourly_price)}<span className="text-white/40 text-xs font-normal font-sans">/hora</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
