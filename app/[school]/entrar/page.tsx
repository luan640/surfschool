import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StudentAuthClient } from './StudentAuthClient'

interface Props {
  params: Promise<{ school: string }>
  searchParams?: Promise<{ mode?: string; next?: string }>
}

export default async function StudentAuthPage({ params, searchParams }: Props) {
  const { school: slug } = await params
  const query = searchParams ? await searchParams : undefined
  const mode = resolveMode(query?.mode)
  const next = resolveNext(query?.next)
  const supabase = await createClient()

  const { data: school } = await supabase
    .from('schools')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!school) {
    redirect('/')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('user_id', user.id)
      .eq('school_id', school.id)
      .maybeSingle()

    if (profile) {
      redirect(resolveStudentDestination(next, slug))
    }

    if (mode !== 'complete') {
      redirect(`/${slug}/entrar?mode=complete&next=${next}`)
    }
  }

  return (
    <StudentAuthClient
      slug={slug}
      schoolId={school.id}
      schoolName={school.name}
      initialMode={mode}
      initialNext={next}
    />
  )
}

function resolveMode(value: string | undefined): 'login' | 'register' | 'complete' {
  if (value === 'login' || value === 'complete') return value
  return 'register'
}

function resolveNext(value: string | undefined): 'agendar' | 'minhas-aulas' {
  return value === 'minhas-aulas' ? 'minhas-aulas' : 'agendar'
}

function resolveStudentDestination(next: 'agendar' | 'minhas-aulas', schoolSlug: string) {
  if (next === 'minhas-aulas') return `/${schoolSlug}/minhas-aulas`
  return `/${schoolSlug}/agendar`
}
