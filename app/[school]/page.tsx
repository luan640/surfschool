import { notFound } from 'next/navigation'
import { getInstructorsBySchoolSlug } from '@/actions/instructors'
import { getPublicLessonPackagesBySchoolSlug } from '@/actions/packages'
import { createClient } from '@/lib/supabase/server'
import { SchoolBookingHub } from './school-booking-hub'

export default async function SchoolLandingPage({ params }: { params: Promise<{ school: string }> }) {
  const { school: slug } = await params
  const supabase = await createClient()

  const { data: school } = await supabase
    .from('schools')
    .select('slug, name, tagline, address, whatsapp, logo_url')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!school) notFound()

  const [instructors, packages] = await Promise.all([
    getInstructorsBySchoolSlug(slug),
    getPublicLessonPackagesBySchoolSlug(slug),
  ])

  return (
    <SchoolBookingHub
      school={school}
      instructors={instructors}
      packages={packages}
    />
  )
}
