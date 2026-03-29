'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, Instructor, InstructorAvailability } from '@/lib/types'

export async function getMySchool() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('schools')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  return data
}

export async function getInstructors(): Promise<Instructor[]> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  const { data } = await supabase
    .from('instructors')
    .select('*, availability:instructor_availability(*)')
    .eq('school_id', school.id)
    .order('created_at', { ascending: true })

  return (data ?? []) as Instructor[]
}

export async function createInstructor(formData: FormData): Promise<ActionResult<Instructor>> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Não autorizado' }

  const { data, error } = await supabase
    .from('instructors')
    .insert({
      school_id:    school.id,
      full_name:    formData.get('full_name') as string,
      phone:        formData.get('phone') as string || null,
      instagram:    formData.get('instagram') as string || null,
      specialty:    formData.get('specialty') as string || null,
      bio:          formData.get('bio') as string || null,
      hourly_price: parseFloat(formData.get('hourly_price') as string),
      color:        formData.get('color') as string || '#0077b6',
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/instructors')
  return { success: true, data: data as Instructor }
}

export async function updateInstructor(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('instructors')
    .update({
      full_name:    formData.get('full_name') as string,
      phone:        formData.get('phone') as string || null,
      instagram:    formData.get('instagram') as string || null,
      specialty:    formData.get('specialty') as string || null,
      bio:          formData.get('bio') as string || null,
      hourly_price: parseFloat(formData.get('hourly_price') as string),
      color:        formData.get('color') as string,
      active:       formData.get('active') === 'true',
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/instructors')
  return { success: true, data: undefined }
}

export async function saveAvailability(
  instructorId: string,
  availability: Array<{ weekday: number; time_slots: string[] }>,
): Promise<ActionResult> {
  const supabase = await createClient()

  // Upsert each weekday
  for (const { weekday, time_slots } of availability) {
    const { error } = await supabase
      .from('instructor_availability')
      .upsert({ instructor_id: instructorId, weekday, time_slots }, { onConflict: 'instructor_id,weekday' })

    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/instructors')
  return { success: true, data: undefined }
}

export async function deleteInstructor(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('instructors').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/instructors')
  return { success: true, data: undefined }
}

/** Public — used by the student booking flow */
export async function getInstructorsBySchoolSlug(slug: string): Promise<Instructor[]> {
  const supabase = await createClient()

  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!school) return []

  const { data } = await supabase
    .from('instructors')
    .select('*, availability:instructor_availability(*)')
    .eq('school_id', school.id)
    .eq('active', true)

  return (data ?? []) as Instructor[]
}
