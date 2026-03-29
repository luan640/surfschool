import { notFound } from 'next/navigation'
import { CalendarDays, MapPin, Users, Waves } from 'lucide-react'
import { getPublicTripBySlugs } from '@/actions/trips'
import { TripCheckoutBrick } from '@/components/checkout/TripCheckoutBrick'
import { formatPrice } from '@/lib/utils'

interface Props {
  params: Promise<{ school: string; trip: string }>
}

export default async function PublicTripPage({ params }: Props) {
  const { school, trip } = await params
  const data = await getPublicTripBySlugs(school, trip)

  if (!data) notFound()

  return (
    <div className="min-h-dvh bg-slate-50">
      <section className="relative overflow-hidden bg-[linear-gradient(140deg,#0d1b2a_0%,#0369a1_55%,#38bdf8_100%)] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,.12),transparent_40%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1.15fr_.85fr] lg:py-16">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]">
              <Waves size={13} />
              {data.school_name}
            </div>
            <h1 className="font-condensed text-4xl font-bold uppercase leading-none tracking-wide sm:text-6xl">
              {data.title}
            </h1>
            {data.summary && <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">{data.summary}</p>}

            <div className="mt-8 grid gap-3 sm:grid-cols-4">
              <InfoCard icon={<CalendarDays size={16} />} label="Saida" value={formatDateTime(data.departure_at ?? data.starts_at)} />
              <InfoCard icon={<CalendarDays size={16} />} label="Chegada" value={formatDateTime(data.arrival_at ?? data.ends_at)} />
              <InfoCard icon={<MapPin size={16} />} label="Destino" value={data.location ?? 'A definir'} />
              <InfoCard icon={<Users size={16} />} label="Vagas" value={data.capacity ? `${data.capacity} vagas` : 'Vagas limitadas'} />
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/15 bg-white/10 shadow-[0_24px_80px_rgba(2,6,23,.22)] backdrop-blur-sm">
            {data.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.cover_image_url} alt={data.title} className="h-full min-h-[280px] w-full object-cover" />
            ) : (
              <div className="flex min-h-[280px] items-center justify-center bg-black/10 text-7xl">🏄</div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Investimento</div>
            <div className="font-condensed text-5xl font-bold text-slate-900">{formatPrice(Number(data.price))}</div>
          </section>

          {data.description && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Sobre a trip</div>
              <div className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{data.description}</div>
            </section>
          )}

          {(data.images?.length ?? 0) > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Galeria</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data.images?.map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={image.id} src={image.image_url} alt={data.title} className="h-32 w-full rounded-xl object-cover sm:h-40" />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <TripCheckoutBrick
            tripId={data.id}
            schoolId={data.school_id}
            schoolSlug={data.school_slug}
            amount={Number(data.price)}
            title={data.title}
          />
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
      <div className="mb-3 inline-flex rounded-full bg-white/15 p-2 text-white">{icon}</div>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  )
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
