import { getAvailablePackageInstructors, getLessonPackages } from '@/actions/packages'
import { getMercadoPagoConnection } from '@/actions/dashboard'
import { PackagesPageClient } from '@/components/dashboard/PackagesPageClient'

export default async function PackagesPage() {
  const [packages, instructors, connection] = await Promise.all([
    getLessonPackages(),
    getAvailablePackageInstructors(),
    getMercadoPagoConnection(),
  ])

  return <PackagesPageClient packages={packages} instructors={instructors} mpConnected={connection?.status === 'connected'} />
}
