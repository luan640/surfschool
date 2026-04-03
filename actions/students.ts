'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { findAuthUserByEmail } from '@/lib/supabase/auth-admin'
import { createClient } from '@/lib/supabase/server'
import { validateCpfField } from '@/lib/cpf'
import { validatePhoneField } from '@/lib/phone'
import { getMySchool } from './instructors'
import type { ActionResult, DashboardStudentRow } from '@/lib/types'

export async function getDashboardStudents(): Promise<DashboardStudentRow[]> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  const [{ data: students }, { data: bookings }] = await Promise.all([
    supabase
      .from('student_profiles')
      .select('*')
      .eq('school_id', school.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('bookings')
      .select('student_id, lesson_date, status')
      .eq('school_id', school.id)
      .neq('status', 'cancelled'),
  ])

  const rows = students ?? []

  const today = new Date().toISOString().slice(0, 10)
  const bookingSummary = new Map<string, { total: number; upcoming: number }>()

  for (const booking of bookings ?? []) {
    const current = bookingSummary.get(booking.student_id) ?? { total: 0, upcoming: 0 }
    current.total += 1
    if (booking.lesson_date >= today) current.upcoming += 1
    bookingSummary.set(booking.student_id, current)
  }

  return rows.map((student) => {
    const summary = bookingSummary.get(student.id) ?? { total: 0, upcoming: 0 }

    return {
      ...student,
      email: student.email ?? null,
      total_bookings: summary.total,
      upcoming_bookings: summary.upcoming,
    }
  })
}

export async function createDashboardStudent(formData: FormData): Promise<ActionResult> {
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const email = ((formData.get('email') as string | null) ?? '').trim().toLowerCase()
  const password = (formData.get('password') as string | null) ?? ''
  const fullName = ((formData.get('full_name') as string | null) ?? '').trim()
  const birthDate = ((formData.get('birth_date') as string | null) ?? '').trim()
  const trialLessonEligible = formData.get('trial_lesson_eligible') === 'true'
  const phoneResult = validatePhoneField(formData.get('phone') as string | null, 'Telefone')
  const cpfResult = validateCpfField(formData.get('cpf') as string | null, 'CPF')

  if (!email || !password || !fullName || !birthDate) {
    return { success: false, error: 'Preencha nome, e-mail, CPF, data de nascimento e senha do aluno.' }
  }

  if (phoneResult.error) {
    return { success: false, error: phoneResult.error }
  }

  if (cpfResult.error) {
    return { success: false, error: cpfResult.error }
  }

  if (password.length < 6) {
    return { success: false, error: 'A senha precisa ter pelo menos 6 caracteres.' }
  }

  const admin = createAdminClient()
  const { data: existingCpfProfile } = await admin
    .from('student_profiles')
    .select('id')
    .eq('school_id', school.id)
    .eq('cpf', cpfResult.value)
    .maybeSingle()

  if (existingCpfProfile) {
    return { success: false, error: 'Ja existe um aluno com este CPF nesta escola.' }
  }

  const { data: existingEmailProfile } = await admin
    .from('student_profiles')
    .select('id')
    .eq('school_id', school.id)
    .eq('email', email)
    .maybeSingle()

  if (existingEmailProfile) {
    return { success: false, error: 'Ja existe um aluno com este e-mail nesta escola.' }
  }

  const existingAuthUser = await findAuthUserByEmail(email)
  let userId = existingAuthUser?.id ?? null
  let createdNewUser = false

  if (!userId) {
    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: fullName, role: 'student' },
    })

    if (createUserError || !createdUser.user) {
      return {
        success: false,
        error: createUserError?.message ?? 'Nao foi possivel criar o acesso do aluno.',
      }
    }

    userId = createdUser.user.id
    createdNewUser = true
  }

  const { error: profileError } = await admin
    .from('student_profiles')
    .insert({
      user_id: userId,
      school_id: school.id,
      full_name: fullName,
      email,
      phone: phoneResult.value,
      cpf: cpfResult.value,
      birth_date: birthDate,
      trial_lesson_eligible: trialLessonEligible,
    })

  if (profileError) {
    if (createdNewUser && userId) {
      await admin.auth.admin.deleteUser(userId)
    }
    return {
      success: false,
      error: `Nao foi possivel criar o perfil do aluno: ${profileError.message}`,
    }
  }

  revalidatePath('/dashboard/students')
  return { success: true, data: undefined }
}
