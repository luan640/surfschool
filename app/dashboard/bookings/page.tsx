import { getBookings, getManualBookingOptions } from '@/actions/bookings'
import { BookingsPageClient } from '@/components/dashboard/BookingsPageClient'

export default async function BookingsPage() {
  const [bookings, bookingOptions] = await Promise.all([
    getBookings(),
    getManualBookingOptions(),
  ])

  return (
    <BookingsPageClient
      bookings={bookings}
      students={bookingOptions.students}
      instructors={bookingOptions.instructors}
    />
  )
}
