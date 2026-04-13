'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { validatePhoneField } from '@/lib/phone'
import { createClient } from '@/lib/supabase/server'
import { ensurePublicBucket } from '@/lib/supabase/storage'
import type { ActionResult, Instructor } from '@/lib/types'

const SCHOOL_ASSETS_BUCKET = 'school-assets'
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024

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
  if (!school) return { success: false, error: 'Nao autorizado' }

  const phoneResult = validatePhoneField(formData.get('phone') as string | null, 'Telefone')
  if (phoneResult.error) return { success: false, error: phoneResult.error }

  const photoResult = await uploadInstructorPhoto({
    schoolId: school.id,
    photoFile: formData.get('photo_file'),
    previousPhotoUrl: null,
  })
  if (photoResult.error) return { success: false, error: photoResult.error }

  const hasPriceOverrides = formData.has('pix_price') || formData.has('card_price')
  const priceOverrides = hasPriceOverrides ? {
    pix_price: formData.get('pix_price') ? parseFloat(formData.get('pix_price') as string) : null,
    card_price: formData.get('card_price') ? parseFloat(formData.get('card_price') as string) : null,
  } : {}

  const { data, error } = await supabase
    .from('instructors')
    .insert({
      school_id: school.id,
      full_name: formData.get('full_name') as string,
      phone: phoneResult.value,
      instagram: (formData.get('instagram') as string) || null,
      specialty: (formData.get('specialty') as string) || null,
      bio: (formData.get('bio') as string) || null,
      hourly_price: parseFloat(formData.get('hourly_price') as string),
      ...priceOverrides,
      color: (formData.get('color') as string) || '#0077b6',
      photo_url: photoResult.photoUrl,
    })
    .select()
    .single()

  if (error) {
    await cleanupStorageFile(photoResult.storagePath)
    return { success: false, error: error.message }
  }

  revalidateInstructorPaths(school.slug)
  return { success: true, data: data as Instructor }
}

export async function updateInstructor(id: string, formData: FormData): Promise<ActionResult> {
  try {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const phoneResult = validatePhoneField(formData.get('phone') as string | null, 'Telefone')
  if (phoneResult.error) return { success: false, error: phoneResult.error }

  const { data: currentInstructor, error: currentError } = await supabase
    .from('instructors')
    .select('photo_url')
    .eq('id', id)
    .eq('school_id', school.id)
    .single()

  if (currentError) return { success: false, error: currentError.message }

  const photoResult = await uploadInstructorPhoto({
    schoolId: school.id,
    photoFile: formData.get('photo_file'),
    previousPhotoUrl: currentInstructor?.photo_url ?? null,
  })
  if (photoResult.error) return { success: false, error: photoResult.error }

  // Only include pix_price/card_price when the form actually submitted them
  // (i.e. MP is connected and the columns exist in the DB after migration 028)
  const hasPriceOverrides = formData.has('pix_price') || formData.has('card_price')
  const priceOverrides = hasPriceOverrides ? {
    pix_price: formData.get('pix_price') ? parseFloat(formData.get('pix_price') as string) : null,
    card_price: formData.get('card_price') ? parseFloat(formData.get('card_price') as string) : null,
  } : {}

  const { error } = await supabase
    .from('instructors')
    .update({
      full_name: formData.get('full_name') as string,
      phone: phoneResult.value,
      instagram: (formData.get('instagram') as string) || null,
      specialty: (formData.get('specialty') as string) || null,
      bio: (formData.get('bio') as string) || null,
      hourly_price: parseFloat(formData.get('hourly_price') as string),
      ...priceOverrides,
      color: formData.get('color') as string,
      active: formData.get('active') === 'true',
      photo_url: photoResult.photoUrl,
    })
    .eq('id', id)

  if (error) {
    if (photoResult.storagePath && photoResult.photoUrl !== currentInstructor?.photo_url) {
      await cleanupStorageFile(photoResult.storagePath)
    }
    return { success: false, error: error.message }
  }

  revalidateInstructorPaths(school.slug)
  return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro inesperado ao salvar instrutor.' }
  }
}

export async function saveAvailability(
  instructorId: string,
  availability: Array<{ weekday: number; time_slots: string[] }>,
): Promise<ActionResult> {
  const supabase = await createClient()

  for (const { weekday, time_slots } of availability) {
    const { error } = await supabase
      .from('instructor_availability')
      .upsert({ instructor_id: instructorId, weekday, time_slots }, { onConflict: 'instructor_id,weekday' })

    if (error) return { success: false, error: error.message }
  }

  const school = await getMySchool()
  revalidateInstructorPaths(school?.slug)
  return { success: true, data: undefined }
}

export async function deleteInstructor(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const { data: currentInstructor } = await supabase
    .from('instructors')
    .select('photo_url')
    .eq('id', id)
    .eq('school_id', school.id)
    .single()

  const { error } = await supabase.from('instructors').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  await cleanupStorageFile(extractStoragePath(currentInstructor?.photo_url ?? null))
  revalidateInstructorPaths(school.slug)
  return { success: true, data: undefined }
}

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

async function uploadInstructorPhoto({
  schoolId,
  photoFile,
  previousPhotoUrl,
}: {
  schoolId: string
  photoFile: FormDataEntryValue | null
  previousPhotoUrl: string | null
}) {
  if (!(photoFile instanceof File) || photoFile.size === 0) {
    return { photoUrl: previousPhotoUrl, storagePath: null, error: null as string | null }
  }

  if (!ALLOWED_PHOTO_TYPES.includes(photoFile.type)) {
    return { photoUrl: null, storagePath: null, error: 'Envie a foto do instrutor em JPG, PNG ou WEBP.' }
  }

  if (photoFile.size > MAX_PHOTO_SIZE_BYTES) {
    return { photoUrl: null, storagePath: null, error: 'A foto do instrutor deve ter no maximo 2 MB.' }
  }

  const admin = createAdminClient()
  await ensurePublicBucket(SCHOOL_ASSETS_BUCKET)
  const extension = photoFile.name.includes('.') ? photoFile.name.split('.').pop()?.toLowerCase() ?? 'jpg' : 'jpg'
  const storagePath = `schools/${schoolId}/instructors/photo-${Date.now()}.${extension}`

  const previousPath = extractStoragePath(previousPhotoUrl)
  if (previousPath) {
    await cleanupStorageFile(previousPath)
  }

  const { error: uploadError } = await admin.storage
    .from(SCHOOL_ASSETS_BUCKET)
    .upload(storagePath, photoFile, {
      upsert: true,
      contentType: photoFile.type,
      cacheControl: '3600',
    })

  if (uploadError) {
    return { photoUrl: null, storagePath: null, error: `Não foi possível enviar a foto: ${uploadError.message}` }
  }

  const { data: publicPhoto } = admin.storage
    .from(SCHOOL_ASSETS_BUCKET)
    .getPublicUrl(storagePath)

  return { photoUrl: publicPhoto.publicUrl, storagePath, error: null as string | null }
}

function extractStoragePath(publicUrl: string | null) {
  if (!publicUrl) return null
  const marker = `/storage/v1/object/public/${SCHOOL_ASSETS_BUCKET}/`
  const markerIndex = publicUrl.indexOf(marker)
  if (markerIndex === -1) return null
  return publicUrl.slice(markerIndex + marker.length)
}

async function cleanupStorageFile(storagePath: string | null) {
  if (!storagePath) return

  const admin = createAdminClient()
  await admin.storage.from(SCHOOL_ASSETS_BUCKET).remove([storagePath])
}

function revalidateInstructorPaths(schoolSlug?: string | null) {
  revalidatePath('/dashboard/instructors')
  if (schoolSlug) {
    revalidatePath(`/${schoolSlug}`)
    revalidatePath(`/${schoolSlug}/agendar`)
  }
}
