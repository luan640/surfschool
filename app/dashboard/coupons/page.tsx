import Link from 'next/link'
import { Pencil, Plus, TicketPercent } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getDiscountCoupons } from '@/actions/coupons'

export default async function CouponsPage() {
  const coupons = await getDiscountCoupons()

  return (
    <div className="dashboard-page">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-condensed text-3xl font-bold uppercase tracking-wide text-slate-800">
            Cupons
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {coupons.length} cupom{coupons.length !== 1 ? 's' : ''} cadastrado{coupons.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/coupons/new">
            <Plus size={15} /> Novo cupom
          </Link>
        </Button>
      </div>

      {coupons.length === 0 ? (
        <div className="rounded border border-slate-200 bg-white py-16 text-center">
          <div className="mb-3 text-4xl">🎟️</div>
          <h2 className="mb-2 font-condensed text-xl font-bold uppercase text-slate-800">Nenhum cupom ainda</h2>
          <p className="mb-6 text-sm text-slate-400">
            Crie cupons com vigencia, limite total e limite por usuario.
          </p>
          <Button asChild size="sm">
            <Link href="/dashboard/coupons/new">
              <Plus size={15} /> Criar primeiro cupom
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="overflow-hidden rounded border border-slate-200 bg-white transition-shadow hover:shadow-md">
              <div className="h-1.5 bg-[var(--cta)]" />
              <div className="p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-condensed text-lg font-bold uppercase tracking-wide text-slate-800 truncate">
                      {coupon.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">{coupon.code}</p>
                  </div>
                  <Badge variant={coupon.active ? 'success' : 'neutral'}>
                    {coupon.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                {coupon.description && (
                  <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-slate-500">{coupon.description}</p>
                )}

                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Desconto</p>
                    <p className="font-condensed text-2xl font-bold text-[var(--primary)]">
                      {coupon.discount_type === 'percentage'
                        ? `${Number(coupon.discount_value)}%`
                        : `R$ ${Number(coupon.discount_value).toFixed(2).replace('.', ',')}`}
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-100 p-2 text-slate-500">
                    <TicketPercent size={15} />
                  </div>
                </div>

                <div className="mb-4 space-y-1 text-xs text-slate-500">
                  <div>Limite total: {coupon.usage_limit_total ?? 'Ilimitado'}</div>
                  <div>Por usuario: {coupon.usage_limit_per_user ?? 'Ilimitado'}</div>
                  <div>Inicio: {coupon.starts_at ? new Date(coupon.starts_at).toLocaleString('pt-BR') : 'Imediato'}</div>
                  <div>Fim: {coupon.ends_at ? new Date(coupon.ends_at).toLocaleString('pt-BR') : 'Sem data limite'}</div>
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Servicos</p>
                  <div className="flex flex-wrap gap-2">
                    {coupon.applies_to_single_lesson && (
                      <div className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                        Aula avulsa
                      </div>
                    )}
                    {coupon.packages?.map((pkg) => (
                      <div key={pkg.id} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                        {pkg.name}
                      </div>
                    ))}
                  </div>
                </div>

                <Button asChild variant="ghost" size="sm" fullWidth>
                  <Link href={`/dashboard/coupons/${coupon.id}`}>
                    <Pencil size={13} /> Editar
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
