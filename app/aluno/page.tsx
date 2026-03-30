'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Loader2, MapPin, Search, Waves } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'

type SchoolSearchItem = {
  id: string
  name: string
  slug: string
  address: string | null
}

export default function StudentSchoolSearchPage() {
  const [schools, setSchools] = useState<SchoolSearchItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadSchools() {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('schools')
        .select('id, name, slug, address')
        .eq('active', true)
        .order('name', { ascending: true })

      if (!active) return

      if (fetchError) {
        setError('Não foi possível carregar as escolas agora.')
        setLoading(false)
        return
      }

      setSchools((data ?? []) as SchoolSearchItem[])
      setLoading(false)
    }

    void loadSchools()

    return () => {
      active = false
    }
  }, [])

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')

  const filteredSchools = useMemo(() => {
    if (!normalizedQuery) return []

    return schools.filter((school) => {
      const name = school.name.toLocaleLowerCase('pt-BR')
      const address = school.address?.toLocaleLowerCase('pt-BR') ?? ''
      return name.includes(normalizedQuery) || address.includes(normalizedQuery)
    })
  }, [normalizedQuery, schools])

  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#f5f7fb_0%,#edf4f8_100%)] text-slate-900">
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:text-slate-900"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0077b6] text-white shadow-[0_12px_30px_rgba(0,119,182,0.24)]">
                <Waves size={18} />
              </div>
              <div>
                <p className="font-condensed text-2xl font-bold uppercase tracking-[0.12em]">vamosurfar</p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Acesso do aluno
                </p>
              </div>
            </div>
          </div>

          <Link href="/auth/login" className="text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900">
            Sou escola
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:py-14">
        <section className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#0077b6]">Encontre sua escola</p>
          <h1 className="mt-3 font-condensed text-4xl font-bold uppercase leading-[0.94] tracking-[0.06em] md:text-6xl">
            Busque pelo nome da escola.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            Escolha sua escola pelo nome ou pela localização. Ao clicar, você será levado direto para a tela de login daquela escola.
          </p>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.06)] md:p-6">
          <div className="max-w-2xl">
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Nome ou localização
            </label>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: Surf School Floripa ou Campeche"
              icon={<Search size={16} />}
              className="h-12 rounded-xl border-slate-300 bg-slate-50 text-base"
            />
          </div>

          <div className="mt-6 grid gap-4">
            {loading ? (
              <div className="flex items-center gap-3 rounded-[1.4rem] border border-slate-200 bg-slate-50 px-5 py-6 text-slate-600">
                <Loader2 size={18} className="animate-spin" />
                Carregando escolas...
              </div>
            ) : error ? (
              <div className="rounded-[1.4rem] border border-rose-200 bg-rose-50 px-5 py-6 text-rose-700">
                {error}
              </div>
            ) : !normalizedQuery ? (
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-5 py-8 text-center text-slate-600">
                Digite o nome ou a localização da sua escola para ver as opções.
              </div>
            ) : filteredSchools.length === 0 ? (
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 px-5 py-8 text-center text-slate-600">
                Nenhuma escola encontrada com esse nome ou localização.
              </div>
            ) : (
              filteredSchools.map((school) => (
                <Link
                  key={school.id}
                  href={`/${school.slug}/entrar?mode=login&next=minhas-aulas`}
                  className="group flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-5 transition-all hover:-translate-y-0.5 hover:border-[#0077b6]/40 hover:shadow-[0_18px_48px_rgba(0,119,182,0.12)] md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-condensed text-2xl font-bold uppercase tracking-[0.05em] text-slate-900">
                      {school.name}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <MapPin size={14} className="shrink-0" />
                      <span className="truncate">{school.address?.trim() || 'Localização não informada'}</span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-2 self-start rounded-full bg-[#0077b6] px-4 py-2 text-sm font-condensed font-bold uppercase tracking-[0.14em] text-white transition-colors group-hover:bg-[#005f8e] md:self-center">
                    Entrar na escola
                    <ArrowRight size={14} />
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
