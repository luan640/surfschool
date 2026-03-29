import { getAvailablePackageInstructors, getLessonPackages } from '@/actions/packages'
import { PackagesPageClient } from '@/components/dashboard/PackagesPageClient'

export default async function PackagesPage() {
  const [packages, instructors] = await Promise.all([
    getLessonPackages(),
    getAvailablePackageInstructors(),
  ])

  return <PackagesPageClient packages={packages} instructors={instructors} />
}
