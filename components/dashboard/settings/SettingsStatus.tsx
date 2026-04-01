import type { PaymentProviderConnection } from '@/lib/types'

export function Banner({ tone, text }: { tone: 'success' | 'warning' | 'error'; text: string }) {
  const styles = tone === 'success'
    ? 'mb-6 rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'
    : tone === 'warning'
      ? 'mb-6 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700'
      : 'mb-6 rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'

  return <div className={styles}>{text}</div>
}

export function ConnectionBadge({ status }: { status: PaymentProviderConnection['status'] | 'disconnected' }) {
  const label = status === 'connected'
    ? 'Conectado'
    : status === 'expired'
      ? 'Expirado'
      : status === 'revoked'
        ? 'Revogado'
        : status === 'error'
          ? 'Erro'
          : 'Não conectado'

  const className = status === 'connected'
    ? 'rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase text-emerald-700'
    : status === 'error' || status === 'expired' || status === 'revoked'
      ? 'rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold uppercase text-rose-700'
      : 'rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase text-slate-600'

  return <div className={className}>{label}</div>
}
