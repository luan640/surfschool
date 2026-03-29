'use server'

import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import { redirect } from 'next/navigation'
import type { ActionResult } from '@/lib/types'

export async function signUpOwner(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const schoolName = formData.get('school_name') as string
  const phone = formData.get('phone') as string

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error || !data.user) {
    return { success: false, error: error?.message ?? 'Erro ao criar conta' }
  }

  const { error: schoolErr } = await createSchoolForOwner({
    supabase,
    ownerId: data.user.id,
    schoolName,
    phone,
  })

  if (schoolErr) {
    return { success: false, error: 'Conta criada, mas escola não pôde ser registrada: ' + schoolErr.message }
  }

  redirect('/dashboard/overview')
}

export async function completeOwnerSchoolRegistration(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Sessão inválida. Faça login novamente.' }
  }

  const schoolName = formData.get('school_name') as string
  const phone = formData.get('phone') as string

  const { data: existingSchool } = await supabase
    .from('schools')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (existingSchool) {
    redirect('/dashboard/overview')
  }

  const { error } = await createSchoolForOwner({
    supabase,
    ownerId: user.id,
    schoolName,
    phone,
  })

  if (error) {
    return { success: false, error: 'Não foi possível concluir o cadastro da escola: ' + error.message }
  }

  redirect('/dashboard/overview')
}

export async function signInOwner(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { success: false, error: 'E-mail ou senha inválidos' }

  redirect('/dashboard/overview')
}

export async function signUpStudent(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  const schoolId = formData.get('school_id') as string
  const schoolSlug = formData.get('school_slug') as string
  const next = resolveStudentDestination(formData.get('next') as string | null, schoolSlug)

  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error || !data.user) {
    return { success: false, error: error?.message ?? 'Erro ao criar conta' }
  }

  const { error: profileErr } = await supabase.from('student_profiles').insert({
    user_id: data.user.id,
    school_id: schoolId,
    full_name: fullName,
    phone,
  })

  if (profileErr) {
    return { success: false, error: 'Conta criada, mas perfil não pôde ser registrado: ' + profileErr.message }
  }

  redirect(next)
}

export async function completeStudentProfileRegistration(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Sessão inválida. Faça login novamente.' }
  }

  const fullName = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  const schoolId = formData.get('school_id') as string
  const schoolSlug = formData.get('school_slug') as string
  const next = resolveStudentDestination(formData.get('next') as string | null, schoolSlug)

  const { data: existingProfile } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('school_id', schoolId)
    .maybeSingle()

  if (existingProfile) {
    redirect(next)
  }

  const { error } = await supabase.from('student_profiles').insert({
    user_id: user.id,
    school_id: schoolId,
    full_name: fullName,
    phone,
  })

  if (error) {
    return { success: false, error: 'Não foi possível concluir seu cadastro nesta escola: ' + error.message }
  }

  redirect(next)
}

export async function signInStudent(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const schoolId = formData.get('school_id') as string
  const schoolSlug = formData.get('school_slug') as string
  const nextKey = resolveStudentNextKey(formData.get('next') as string | null)
  const next = resolveStudentDestination(nextKey, schoolSlug)

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    return { success: false, error: 'E-mail ou senha inválidos' }
  }

  const { data: profile } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('user_id', data.user.id)
    .eq('school_id', schoolId)
    .single()

  if (!profile) {
    redirect(`/${schoolSlug}/entrar?mode=complete&next=${nextKey}`)
  }

  redirect(next)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

async function createSchoolForOwner({
  supabase,
  ownerId,
  schoolName,
  phone,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  ownerId: string
  schoolName: string
  phone: string
}) {
  const slug = slugify(schoolName)

  const { data: existing } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  const finalSlug = existing ? `${slug}-${Date.now().toString().slice(-4)}` : slug

  return supabase.from('schools').insert({
    owner_id: ownerId,
    slug: finalSlug,
    name: schoolName,
    tagline: 'Escola de Surf',
    phone,
  })
}

function resolveStudentNextKey(next: string | null) {
  return next === 'minhas-aulas' ? 'minhas-aulas' : 'agendar'
}

function resolveStudentDestination(next: string | null, schoolSlug: string) {
  if (resolveStudentNextKey(next) === 'minhas-aulas') return `/${schoolSlug}/minhas-aulas`
  return `/${schoolSlug}/agendar`
}
