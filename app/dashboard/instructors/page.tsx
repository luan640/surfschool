import { getInstructors } from '@/actions/instructors'
import { getMercadoPagoConnection } from '@/actions/dashboard'
import { InstructorsPageClient } from '@/components/dashboard/InstructorsPageClient'

export default async function InstructorsPage() {
  const [instructors, connection] = await Promise.all([
    getInstructors(),
    getMercadoPagoConnection(),
  ])

  return <InstructorsPageClient instructors={instructors} mpConnected={connection?.status === 'connected'} />
}
