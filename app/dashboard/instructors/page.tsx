import Link from 'next/link'
import { getInstructors } from '@/actions/instructors'
import { formatPrice, initials, WEEKDAYS_PT } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Instagram, Phone, Pencil } from 'lucide-react'

export default async function InstructorsPage() {
  const instructors = await getInstructors()

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-condensed text-3xl font-bold uppercase text-slate-800 tracking-wide">
            Instrutores
          </h1>
          <p className="text-slate-400 text-sm mt-1">{instructors.length} instrutor{instructors.length !== 1 ? 'es' : ''} cadastrado{instructors.length !== 1 ? 's' : ''}</p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/instructors/new">
            <Plus size={15} /> Novo Instrutor
          </Link>
        </Button>
      </div>

      {instructors.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded">
          <div className="text-4xl mb-3">🏄</div>
          <h2 className="font-condensed text-xl font-bold text-slate-800 uppercase mb-2">
            Nenhum instrutor ainda
          </h2>
          <p className="text-slate-400 text-sm mb-6">Cadastre o primeiro instrutor da sua escola.</p>
          <Button asChild size="sm">
            <Link href="/dashboard/instructors/new"><Plus size={15} /> Adicionar</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {instructors.map(instr => {
            const availDays = (instr.availability ?? []).map(a => WEEKDAYS_PT[a.weekday]).join(', ')
            return (
              <div key={instr.id} className="bg-white border border-slate-200 rounded overflow-hidden hover:shadow-md transition-shadow">
                {/* Color bar */}
                <div className="h-1.5" style={{ background: instr.color }} />

                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    {instr.photo_url ? (
                      <img src={instr.photo_url} alt={instr.full_name}
                        className="w-12 h-12 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-condensed font-bold text-base shrink-0"
                        style={{ background: instr.color }}>
                        {initials(instr.full_name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-condensed font-bold text-slate-800 uppercase tracking-wide text-base truncate">
                        {instr.full_name}
                      </h3>
                      {instr.specialty && (
                        <p className="text-[var(--primary)] text-xs font-bold uppercase tracking-wide">{instr.specialty}</p>
                      )}
                    </div>
                    <Badge variant={instr.active ? 'success' : 'neutral'} className="shrink-0 text-[10px]">
                      {instr.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>

                  {instr.bio && (
                    <p className="text-slate-500 text-xs leading-relaxed mb-3 line-clamp-2">{instr.bio}</p>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <span className="font-condensed text-xl font-bold" style={{ color: 'var(--primary)' }}>
                      {formatPrice(instr.hourly_price)}
                      <span className="text-slate-400 text-xs font-normal font-sans">/hora</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {instr.phone && (
                        <a href={`tel:${instr.phone}`} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <Phone size={14} />
                        </a>
                      )}
                      {instr.instagram && (
                        <a href={`https://instagram.com/${instr.instagram.replace('@','')}`} target="_blank"
                          className="text-slate-400 hover:text-pink-500 transition-colors">
                          <Instagram size={14} />
                        </a>
                      )}
                    </div>
                  </div>

                  {availDays && (
                    <p className="text-xs text-slate-400 mb-4">
                      📅 {availDays}
                    </p>
                  )}

                  <Button asChild variant="ghost" size="sm" fullWidth>
                    <Link href={`/dashboard/instructors/${instr.id}`}>
                      <Pencil size={13} /> Editar
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
