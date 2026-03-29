'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
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

  const admin = createAdminClient()
  const rows = students ?? []

  const usersById = new Map<string, string | null>()
  await Promise.all(
    rows.map(async (student) => {
      const { data, error } = await admin.auth.admin.getUserById(student.user_id)
      usersById.set(student.user_id, error ? null : data.user?.email ?? null)
    }),
  )

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
      email: usersById.get(student.user_id) ?? null,
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
  const phoneResult = validatePhoneField(formData.get('phone') as string | null, 'Telefone')

  if (!email || !password || !fullName) {
    return { success: false, error: 'Preencha nome, e-mail e senha do aluno.' }
  }

  if (phoneResult.error) {
    return { success: false, error: phoneResult.error }
  }

  if (password.length < 6) {
    return { success: false, error: 'A senha precisa ter pelo menos 6 caracteres.' }
  }

  const admin = createAdminClient()
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

  const { error: profileError } = await admin
    .from('student_profiles')
    .insert({
      user_id: createdUser.user.id,
      school_id: school.id,
      full_name: fullName,
      phone: phoneResult.value,
    })

  if (profileError) {
    await admin.auth.admin.deleteUser(createdUser.user.id)
    return {
      success: false,
      error: `Nao foi possivel criar o perfil do aluno: ${profileError.message}`,
    }
  }

  revalidatePath('/dashboard/students')
  return { success: true, data: undefined }
}
