import type { Booking } from '@/lib/types'

export type BookingVisualStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export function getBookingVisualStatus(booking: Pick<Booking, 'status' | 'payment_status'>): BookingVisualStatus {
  if (booking.status === 'cancelled') return 'cancelled'
  if (booking.status === 'completed') return 'completed'
  if (booking.payment_status === 'pending') return 'pending'
  return 'confirmed'
}
