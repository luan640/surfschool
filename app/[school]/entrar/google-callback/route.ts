import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ school: string }> }) {
  const { school: slug } = await params
  const url = new URL(request.url)
  const dest = url.searchParams.get('dest') ?? 'agendar'
  const loginUrl = new URL(`/${slug}/entrar`, request.url)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(loginUrl)
  }

  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!school) {
    return NextResponse.redirect(loginUrl)
  }

  const { data: profile } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('school_id', school.id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.redirect(new URL(`/${slug}/entrar?mode=complete&next=${dest}`, request.url))
  }

  const destination = dest === 'minhas-aulas' ? `/${slug}/minhas-aulas` : `/${slug}/agendar`
  return NextResponse.redirect(new URL(destination, request.url))
}
