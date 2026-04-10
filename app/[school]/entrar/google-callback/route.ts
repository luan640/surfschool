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
    // Auto-replicate profile from another school if it exists
    const { data: existingProfile } = await supabase
      .from('student_profiles')
      .select('full_name, email, phone, cpf, birth_date')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (existingProfile) {
      await supabase.from('student_profiles').insert({
        user_id: user.id,
        school_id: school.id,
        full_name: existingProfile.full_name,
        email: existingProfile.email,
        phone: existingProfile.phone,
        cpf: existingProfile.cpf,
        birth_date: existingProfile.birth_date,
      })
    } else {
      return NextResponse.redirect(new URL(`/${slug}/entrar?mode=complete&next=${dest}`, request.url))
    }
  }

  const destination = dest === 'minhas-aulas' ? `/${slug}/minhas-aulas` : `/${slug}/agendar`
  return NextResponse.redirect(new URL(destination, request.url))
}
