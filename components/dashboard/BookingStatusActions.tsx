'use client'

import { useState } from 'react'
import { updateBookingStatus } from '@/actions/bookings'
import type { BookingStatus } from '@/lib/types'
import { Check, X, RotateCcw } from 'lucide-react'

interface Props {
  bookingId: string
  status:    BookingStatus
}

export function BookingStatusActions({ bookingId, status }: Props) {
  const [loading, setLoading] = useState(false)

  async function change(next: BookingStatus) {
    setLoading(true)
    await updateBookingStatus(bookingId, next)
    setLoading(false)
  }

  if (status === 'cancelled') return null

  return (
    <div className="flex items-center gap-1">
      {status !== 'completed' && (
        <button
          onClick={() => change('completed')}
          disabled={loading}
          title="Marcar como concluída"
          className="p-1.5 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
        >
          <Check size={13} />
        </button>
      )}
      {status !== 'confirmed' && status !== 'completed' && (
        <button
          onClick={() => change('confirmed')}
          disabled={loading}
          title="Confirmar"
          className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          <RotateCcw size={13} />
        </button>
      )}
      <button
        onClick={() => change('cancelled')}
        disabled={loading}
        title="Cancelar"
        className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
      >
        <X size={13} />
      </button>
    </div>
  )
}
