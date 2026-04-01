import { notFound } from 'next/navigation'
import { getInstructorsBySchoolSlug } from '@/actions/instructors'
import { getPublicLessonPackagesBySchoolSlug } from '@/actions/packages'
import { createClient } from '@/lib/supabase/server'
import { SchoolBookingHub } from './school-booking-hub'

export default async function SchoolLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ school: string }>
  searchParams?: Promise<{ tab?: string }>
}) {
  const { school: slug } = await params
  const query = searchParams ? await searchParams : undefined
  const supabase = await createClient()

  const { data: school } = await supabase
    .from('schools')
    .select('slug, name, tagline, address, phone, logo_url')
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
      initialTab={resolveInitialTab(query?.tab)}
    />
  )
}

function resolveInitialTab(tab: string | undefined): 'details' | 'services' | 'pros' {
  if (tab === 'services' || tab === 'pros') return tab
  return 'details'
}
