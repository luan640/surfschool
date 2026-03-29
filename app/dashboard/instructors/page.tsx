import { getInstructors } from '@/actions/instructors'
import { InstructorsPageClient } from '@/components/dashboard/InstructorsPageClient'

export default async function InstructorsPage() {
  const instructors = await getInstructors()

  return <InstructorsPageClient instructors={instructors} />
}
