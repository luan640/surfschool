import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStudentBookingsBySchoolSlug, getStudentProfile } from '@/actions/bookings'
import { StudentLessonsClient } from './StudentLessonsClient'

interface Props {
  params: Promise<{ school: string }>
  searchParams?: Promise<{ tab?: string }>
}

export default async function StudentLessonsPage({ params, searchParams }: Props) {
  const { school: slug } = await params
  const query = searchParams ? await searchParams : undefined
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${slug}/entrar?mode=login&next=minhas-aulas`)
  }

  const { data: school } = await supabase
    .from('schools')
    .select('id, name, slug, tagline, logo_url')
    .eq('slug', slug)
    .single()

  if (!school) {
    redirect('/')
  }

  const [bookings, profile] = await Promise.all([
    getStudentBookingsBySchoolSlug(slug),
    getStudentProfile(school.id),
  ])

  return (
    <StudentLessonsClient
      school={school}
      bookings={bookings}
      profile={profile}
      initialTab={resolveStudentTab(query?.tab)}
    />
  )
}

function resolveStudentTab(tab: string | undefined): 'upcoming' | 'history' | 'profile' {
  if (tab === 'history' || tab === 'profile') return tab
  return 'upcoming'
}
