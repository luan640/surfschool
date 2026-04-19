'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getMySchool } from './instructors'
import type { ActionResult, Instructor, LessonPackage } from '@/lib/types'

export async function getLessonPackages(): Promise<LessonPackage[]> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  const { data } = await supabase
    .from('lesson_packages')
    .select(`
      *,
      instructors:lesson_package_instructors(
        instructor:instructors(id, full_name, color, specialty, active)
      )
    `)
    .eq('school_id', school.id)
    .order('created_at', { ascending: false })

  return mapPackages(data)
}

export async function getPublicLessonPackagesBySchoolSlug(slug: string): Promise<LessonPackage[]> {
  const supabase = await createClient()

  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (!school) return []

  const { data } = await supabase
    .from('lesson_packages')
    .select(`
      *,
      instructors:lesson_package_instructors(
        instructor:instructors(id, full_name, color, specialty, active)
      )
    `)
    .eq('school_id', school.id)
    .eq('active', true)
    .order('created_at', { ascending: false })

  return mapPackages(data)
}

export async function getLessonPackageById(id: string): Promise<LessonPackage | null> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return null

  const { data } = await supabase
    .from('lesson_packages')
    .select(`
      *,
      instructors:lesson_package_instructors(
        instructor:instructors(id, full_name, color, specialty, active)
      )
    `)
    .eq('school_id', school.id)
    .eq('id', id)
    .maybeSingle()

  const [pkg] = mapPackages(data ? [data] : null)
  return pkg ?? null
}

export async function getAvailablePackageInstructors(): Promise<Instructor[]> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  const { data } = await supabase
    .from('instructors')
    .select('id, school_id, full_name, specialty, color, active, phone, instagram, bio, hourly_price, photo_url, created_at')
    .eq('school_id', school.id)
    .order('full_name', { ascending: true })

  return (data ?? []) as Instructor[]
}

export async function createLessonPackage(formData: FormData): Promise<ActionResult<LessonPackage>> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const payload = parsePackageFormData(formData)
  if (!payload.success) return payload

  const { data, error } = await supabase
    .from('lesson_packages')
    .insert({
      school_id: school.id,
      name: payload.data.name,
      description: payload.data.description,
      lesson_count: payload.data.lessonCount,
      price: payload.data.price,
      pix_price: payload.data.pixPrice,
      card_price: payload.data.cardPrice,
      card12x_price: payload.data.card12xPrice,
      active: payload.data.active,
    })
    .select()
    .single()

  if (error || !data) {
    return { success: false, error: error?.message ?? 'Não foi possível criar o pacote' }
  }

  const linkResult = await replacePackageInstructors(supabase, data.id, payload.data.instructorIds)
  if (!linkResult.success) return linkResult

  revalidatePath('/dashboard/packages')
  return { success: true, data: data as LessonPackage }
}

export async function updateLessonPackage(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const payload = parsePackageFormData(formData)
  if (!payload.success) return payload

  const { error } = await supabase
    .from('lesson_packages')
    .update({
      name: payload.data.name,
      description: payload.data.description,
      lesson_count: payload.data.lessonCount,
      price: payload.data.price,
      pix_price: payload.data.pixPrice,
      card_price: payload.data.cardPrice,
      card12x_price: payload.data.card12xPrice,
      active: payload.data.active,
    })
    .eq('id', id)
    .eq('school_id', school.id)

  if (error) return { success: false, error: error.message }

  const linkResult = await replacePackageInstructors(supabase, id, payload.data.instructorIds)
  if (!linkResult.success) return linkResult

  revalidatePath('/dashboard/packages')
  revalidatePath(`/dashboard/packages/${id}`)
  return { success: true, data: undefined }
}

export async function deleteLessonPackage(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const { error } = await supabase
    .from('lesson_packages')
    .delete()
    .eq('id', id)
    .eq('school_id', school.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/packages')
  return { success: true, data: undefined }
}

function parsePackageFormData(formData: FormData):
  | { success: true; data: { name: string; description: string | null; lessonCount: number; price: number; pixPrice: number | null; cardPrice: number | null; active: boolean; instructorIds: string[] } }
  | { success: false; error: string } {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const descriptionRaw = (formData.get('description') as string | null)?.trim() ?? ''
  const lessonCount = Number(formData.get('lesson_count'))
  const price = Number(formData.get('price'))
  const activeValue = formData.get('active')
  const instructorIds = Array.from(new Set(formData.getAll('instructor_ids').map(String).filter(Boolean)))

  const pixPriceRaw = formData.get('pix_price')
  const cardPriceRaw = formData.get('card_price')
  const card12xPriceRaw = formData.get('card12x_price')
  const pixPrice = pixPriceRaw && Number(pixPriceRaw) > 0 ? Number(pixPriceRaw) : null
  const cardPrice = cardPriceRaw && Number(cardPriceRaw) > 0 ? Number(cardPriceRaw) : null
  const card12xPrice = card12xPriceRaw && Number(card12xPriceRaw) > 0 ? Number(card12xPriceRaw) : null

  if (!name) return { success: false, error: 'Informe o nome do pacote' }
  if (!Number.isFinite(lessonCount) || lessonCount <= 0) return { success: false, error: 'Informe a quantidade de aulas' }
  if (!Number.isFinite(price) || price < 0) return { success: false, error: 'Informe um valor valido' }
  if (instructorIds.length === 0) return { success: false, error: 'Selecione pelo menos um instrutor' }

  return {
    success: true,
    data: {
      name,
      description: descriptionRaw || null,
      lessonCount,
      price,
      pixPrice,
      cardPrice,
      card12xPrice,
      active: activeValue !== 'false',
      instructorIds,
    },
  }
}

async function replacePackageInstructors(
  supabase: Awaited<ReturnType<typeof createClient>>,
  packageId: string,
  instructorIds: string[],
): Promise<ActionResult> {
  const { error: deleteError } = await supabase
    .from('lesson_package_instructors')
    .delete()
    .eq('package_id', packageId)

  if (deleteError) return { success: false, error: deleteError.message }

  const { error: insertError } = await supabase
    .from('lesson_package_instructors')
    .insert(instructorIds.map((instructorId) => ({ package_id: packageId, instructor_id: instructorId })))

  if (insertError) return { success: false, error: insertError.message }

  return { success: true, data: undefined }
}

function mapPackages(data: any[] | null): LessonPackage[] {
  return (data ?? []).map((item) => ({
    ...item,
    instructors: (item.instructors ?? [])
      .map((row: any) => row.instructor)
      .filter(Boolean),
  })) as LessonPackage[]
}
