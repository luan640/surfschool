import { getBookings, getManualBookingOptions } from '@/actions/bookings'
import { TodayBookingsPageClient } from '@/components/dashboard/TodayBookingsPageClient'

export default async function TodayBookingsPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [bookings, bookingOptions] = await Promise.all([
    getBookings({ from: today, to: today, status: 'confirmed' }),
    getManualBookingOptions(),
  ])

  return (
    <TodayBookingsPageClient
      bookings={bookings}
      instructors={bookingOptions.instructors}
    />
  )
}
