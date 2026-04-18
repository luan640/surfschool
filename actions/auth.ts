'use server'

import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateCpfField } from '@/lib/cpf'
import { findAuthUserByEmail } from '@/lib/supabase/auth-admin'
import { createClient } from '@/lib/supabase/server'
import { validatePhoneField } from '@/lib/phone'
import { slugify } from '@/lib/utils'
import { redirect } from 'next/navigation'
import type { ActionResult } from '@/lib/types'

export async function signUpOwner(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const admin = createAdminClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const schoolName = formData.get('school_name') as string
  const phoneResult = validatePhoneField(formData.get('phone') as string | null, 'Telefone')

  if (phoneResult.error) {
    return { success: false, error: phoneResult.error }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: buildAuthCallbackUrl(getEmailConfirmationStatusPath('success', email)),
    },
  })
  if (error || !data.user) {
    return { success: false, error: error?.message ?? 'Erro ao criar conta' }
  }

  const { error: schoolErr } = await createSchoolForOwner({
    supabase: admin,
    ownerId: data.user.id,
    schoolName,
    phone: phoneResult.value,
  })

  if (schoolErr) {
    return {
      success: false,
      error: 'Sua conta foi criada, mas nao foi possivel finalizar o cadastro da escola agora. Tente novamente em instantes ou entre em contato com o suporte.',
    }
  }

  redirect(`/auth/register/success?email=${encodeURIComponent(email)}`)
}

export async function completeOwnerSchoolRegistration(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Sessão inválida. Faça login novamente.' }
  }

  const schoolName = formData.get('school_name') as string
  const phoneResult = validatePhoneField(formData.get('phone') as string | null, 'Telefone')

  if (phoneResult.error) {
    return { success: false, error: phoneResult.error }
  }

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
    phone: phoneResult.value,
  })

  if (error) {
    return { success: false, error: 'Não foi possível concluir o cadastro da escola: ' + error.message }
  }

  redirect('/dashboard/overview')
}

export async function signInOwner(
  formData: FormData,
): Promise<ActionResult<{ resentConfirmation?: boolean; message?: string }>> {
  const supabase = await createClient()

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (isEmailNotConfirmedError(error)) {
      const existingAuthUser = await findAuthUserByEmail(email)

      if (existingAuthUser && !existingAuthUser.email_confirmed_at) {
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: buildAuthCallbackUrl(getEmailConfirmationStatusPath('success', email)),
          },
        })

        if (resendError) {
          return { success: false, error: resendError.message }
        }

        return {
          success: true,
          data: {
            resentConfirmation: true,
            message: 'Sua conta ainda não foi confirmada. Enviamos um novo link de acesso para o seu e-mail.',
          },
        }
      }
    }

    return { success: false, error: 'E-mail ou senha inválidos' }
  }

  redirect('/dashboard/overview')
}

export async function signUpStudent(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const admin = createAdminClient()

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const birthDate = ((formData.get('birth_date') as string | null) ?? '').trim()
  const phoneResult = validatePhoneField(formData.get('phone') as string | null, 'Telefone')
  const cpfResult = validateCpfField(formData.get('cpf') as string | null, 'CPF')
  const schoolId = formData.get('school_id') as string
  const schoolSlug = formData.get('school_slug') as string
  const next = resolveStudentDestination(formData.get('next') as string | null, schoolSlug)

  if (phoneResult.error) {
    return { success: false, error: phoneResult.error }
  }

  if (cpfResult.error) {
    return { success: false, error: cpfResult.error }
  }

  if (!birthDate) {
    return { success: false, error: 'Data de nascimento e obrigatoria.' }
  }

  const { data: existingCpfProfile } = await admin
    .from('student_profiles')
    .select('id')
    .eq('school_id', schoolId)
    .eq('cpf', cpfResult.value)
    .maybeSingle()

  if (existingCpfProfile) {
    return { success: false, error: 'Ja existe um aluno com este CPF nesta escola.' }
  }

  const { data: existingEmailProfile } = await admin
    .from('student_profiles')
    .select('id')
    .eq('school_id', schoolId)
    .eq('email', email)
    .maybeSingle()

  if (existingEmailProfile) {
    return { success: false, error: 'Ja existe um aluno com este e-mail nesta escola.' }
  }

  const existingAuthUser = await findAuthUserByEmail(email)
  if (existingAuthUser) {
    return {
      success: false,
      error: 'Este e-mail ja possui conta. Use Entrar para acessar ou concluir o cadastro nesta escola.',
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: buildAuthCallbackUrl(getEmailConfirmationStatusPath('success', email)),
    },
  })
  if (error || !data.user) {
    return { success: false, error: error?.message ?? 'Erro ao criar conta' }
  }

  const { error: profileErr } = await supabase.from('student_profiles').insert({
    user_id: data.user.id,
    school_id: schoolId,
    full_name: fullName,
    email,
    phone: phoneResult.value,
    cpf: cpfResult.value,
    birth_date: birthDate,
  })

  if (profileErr) {
    return { success: false, error: 'Conta criada, mas perfil nao pode ser registrado: ' + profileErr.message }
  }

  redirect(next)
}

export async function completeStudentProfileRegistration(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Sessao invalida. Faca login novamente.' }
  }

  const fullName = formData.get('full_name') as string
  const birthDate = ((formData.get('birth_date') as string | null) ?? '').trim()
  const phoneResult = validatePhoneField(formData.get('phone') as string | null, 'Telefone')
  const cpfResult = validateCpfField(formData.get('cpf') as string | null, 'CPF')
  const schoolId = formData.get('school_id') as string
  const schoolSlug = formData.get('school_slug') as string
  const next = resolveStudentDestination(formData.get('next') as string | null, schoolSlug)

  if (phoneResult.error) {
    return { success: false, error: phoneResult.error }
  }

  if (cpfResult.error) {
    return { success: false, error: cpfResult.error }
  }

  if (!birthDate) {
    return { success: false, error: 'Data de nascimento e obrigatoria.' }
  }

  const normalizedEmail = user.email?.trim().toLowerCase() ?? ''

  const { data: existingCpfProfile } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('school_id', schoolId)
    .eq('cpf', cpfResult.value)
    .maybeSingle()

  if (existingCpfProfile) {
    return { success: false, error: 'Ja existe um aluno com este CPF nesta escola.' }
  }

  const { data: existingEmailProfile } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('school_id', schoolId)
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingEmailProfile) {
    return { success: false, error: 'Ja existe um aluno com este e-mail nesta escola.' }
  }

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
    email: normalizedEmail,
    phone: phoneResult.value,
    cpf: cpfResult.value,
    birth_date: birthDate,
  })

  if (error) {
    return { success: false, error: 'Nao foi possivel concluir seu cadastro nesta escola: ' + error.message }
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
    return { success: false, error: 'E-mail ou senha invalidos' }
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

export async function resendConfirmationEmail(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!email) {
    return { success: false, error: 'Informe o e-mail para reenviar a confirmacao.' }
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: buildAuthCallbackUrl(getEmailConfirmationStatusPath('success', email)),
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: undefined }
}

export async function sendPasswordResetEmail(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!email) {
    return { success: false, error: 'Informe o e-mail para recuperar a senha.' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildAuthCallbackUrl('/auth/update-password'),
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: undefined }
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const password = String(formData.get('password') ?? '')
  const confirmPassword = String(formData.get('confirm_password') ?? '')

  if (!password || password.length < 6) {
    return { success: false, error: 'A nova senha precisa ter pelo menos 6 caracteres.' }
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'A confirmacao de senha nao confere.' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Sessao invalida ou expirada. Abra o link do e-mail novamente.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { success: false, error: error.message }
  }

  redirect('/auth/login?reset=success')
}

async function createSchoolForOwner({
  supabase,
  ownerId,
  schoolName,
  phone,
}: {
  supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>
  ownerId: string
  schoolName: string
  phone: string | null
}) {
  const baseSlug = slugify(schoolName) || 'escola'
  const finalSlug = `${baseSlug}-${randomUUID().split('-')[0]}`

  const accessLimit = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  return supabase.from('schools').insert({
    owner_id: ownerId,
    slug: finalSlug,
    name: schoolName,
    tagline: 'Escola de Surf',
    phone,
    plan: 'free',
    access_limit: accessLimit,
  })
}

function resolveStudentNextKey(next: string | null) {
  return next === 'minhas-aulas' ? 'minhas-aulas' : 'agendar'
}

function resolveStudentDestination(next: string | null, schoolSlug: string) {
  if (resolveStudentNextKey(next) === 'minhas-aulas') return `/${schoolSlug}/minhas-aulas`
  return `/${schoolSlug}/agendar`
}

function buildAuthCallbackUrl(nextPath: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://surfschool.vercel.app').replace(/\/$/, '')
  const safeNextPath = nextPath.startsWith('/') ? nextPath : '/auth/confirmed'
  return `${appUrl}/auth/callback?next=${encodeURIComponent(safeNextPath)}`
}

function getEmailConfirmationStatusPath(status: 'success' | 'expired', email: string) {
  return `/auth/confirmation-status?status=${status}&email=${encodeURIComponent(email)}`
}

function isEmailNotConfirmedError(error: { code?: string; message?: string }) {
  return error.code === 'email_not_confirmed' || error.message?.toLowerCase().includes('email not confirmed')
}
