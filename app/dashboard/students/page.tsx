import { getDashboardStudents } from '@/actions/students'
import { StudentsPageClient } from '@/components/dashboard/StudentsPageClient'

export default async function StudentsPage() {
  const students = await getDashboardStudents()

  return <StudentsPageClient students={students} />
}
