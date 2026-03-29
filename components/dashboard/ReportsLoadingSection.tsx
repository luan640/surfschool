import { SurfLoading } from '@/components/dashboard/SurfLoading'

interface Props {
  overlay?: boolean
}

export function ReportsLoadingSection({ overlay = false }: Props) {
  return (
    <div className={`w-full rounded border border-slate-200 ${overlay ? 'bg-white/55 backdrop-blur-[1px]' : 'bg-white/60'}`}>
      <SurfLoading
        compact
        title="Atualizando relatorios"
        subtitle="Buscando indicadores, graficos e resumos com os filtros aplicados."
      />
    </div>
  )
}
