'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ensurePublicBucket } from '@/lib/supabase/storage'
import { slugify } from '@/lib/utils'
import { getMySchool } from './instructors'
import type { ActionResult, Trip, TripImage } from '@/lib/types'

const SCHOOL_ASSETS_BUCKET = 'school-assets'
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE = 4 * 1024 * 1024

export async function getTrips(): Promise<Trip[]> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  const [{ data: trips }, { data: registrations }] = await Promise.all([
    supabase
      .from('trips')
      .select('*, images:trip_images(*)')
      .eq('school_id', school.id)
      .order('starts_at', { ascending: true }),
    supabase
      .from('trip_registrations')
      .select('trip_id, payment_status')
      .eq('school_id', school.id),
  ])

  const counts = new Map<string, { total: number; paid: number }>()
  for (const row of registrations ?? []) {
    const current = counts.get(row.trip_id) ?? { total: 0, paid: 0 }
    current.total += 1
    if (row.payment_status === 'paid') current.paid += 1
    counts.set(row.trip_id, current)
  }

  return ((trips ?? []) as Trip[]).map((trip) => {
    const summary = counts.get(trip.id) ?? { total: 0, paid: 0 }
    return {
      ...trip,
      images: (trip.images ?? []) as TripImage[],
      registrations_count: summary.total,
      paid_registrations_count: summary.paid,
    }
  })
}

export async function getTripById(id: string): Promise<Trip | null> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return null

  const { data } = await supabase
    .from('trips')
    .select('*, images:trip_images(*)')
    .eq('school_id', school.id)
    .eq('id', id)
    .maybeSingle()

  return (data as Trip | null) ?? null
}

export async function getPublicTripBySlugs(schoolSlug: string, tripSlug: string): Promise<(Trip & { school_name: string; school_slug: string; school_whatsapp: string | null }) | null> {
  const supabase = await createClient()

  const { data: school } = await supabase
    .from('schools')
    .select('id, name, slug, whatsapp')
    .eq('slug', schoolSlug)
    .eq('active', true)
    .maybeSingle()

  if (!school) return null

  const { data: trip } = await supabase
    .from('trips')
    .select('*, images:trip_images(*)')
    .eq('school_id', school.id)
    .eq('slug', tripSlug)
    .eq('active', true)
    .maybeSingle()

  if (!trip) return null

  return {
    ...(trip as Trip),
    school_name: school.name,
    school_slug: school.slug,
    school_whatsapp: school.whatsapp,
  }
}

export async function createTrip(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const admin = createAdminClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const payload = parseTripFormData(formData)
  if (!payload.success) return payload

  const slug = await buildUniqueTripSlug(admin, school.id, payload.data.slug || payload.data.title)
  const { data: trip, error } = await admin
    .from('trips')
    .insert({
      school_id: school.id,
      slug,
      title: payload.data.title,
      summary: payload.data.summary,
      description: payload.data.description,
      location: payload.data.location,
      starts_at: payload.data.startsAt,
      ends_at: payload.data.endsAt,
      departure_at: payload.data.departureAt,
      arrival_at: payload.data.arrivalAt,
      price: payload.data.price,
      capacity: payload.data.capacity,
      allow_over_capacity: payload.data.allowOverCapacity,
      allow_late_registrations: payload.data.allowLateRegistrations,
      active: payload.data.active,
    })
    .select('id')
    .single()

  if (error || !trip) {
    return { success: false, error: error?.message ?? 'Nao foi possivel criar a trip.' }
  }

  const mediaResult = await syncTripMedia({
    admin,
    schoolId: school.id,
    tripId: trip.id,
    coverFile: payload.data.coverFile,
    galleryFiles: payload.data.galleryFiles,
    replaceGallery: payload.data.galleryFiles.length > 0,
  })

  if (!mediaResult.success) return mediaResult

  revalidatePath('/dashboard/trips')
  return { success: true, data: { id: trip.id as string } }
}

export async function updateTrip(id: string, formData: FormData): Promise<ActionResult> {
  const admin = createAdminClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const payload = parseTripFormData(formData)
  if (!payload.success) return payload

  const slug = await buildUniqueTripSlug(admin, school.id, payload.data.slug || payload.data.title, id)
  const { error } = await admin
    .from('trips')
    .update({
      slug,
      title: payload.data.title,
      summary: payload.data.summary,
      description: payload.data.description,
      location: payload.data.location,
      starts_at: payload.data.startsAt,
      ends_at: payload.data.endsAt,
      departure_at: payload.data.departureAt,
      arrival_at: payload.data.arrivalAt,
      price: payload.data.price,
      capacity: payload.data.capacity,
      allow_over_capacity: payload.data.allowOverCapacity,
      allow_late_registrations: payload.data.allowLateRegistrations,
      active: payload.data.active,
    })
    .eq('id', id)
    .eq('school_id', school.id)

  if (error) return { success: false, error: error.message }

  const mediaResult = await syncTripMedia({
    admin,
    schoolId: school.id,
    tripId: id,
    coverFile: payload.data.coverFile,
    galleryFiles: payload.data.galleryFiles,
    replaceGallery: payload.data.galleryFiles.length > 0,
  })

  if (!mediaResult.success) return mediaResult

  revalidatePath('/dashboard/trips')
  revalidatePath(`/dashboard/trips/${id}`)
  return { success: true, data: undefined }
}

function parseTripFormData(formData: FormData):
  | { success: true; data: {
      title: string
      slug: string
      summary: string | null
      description: string | null
      location: string | null
      startsAt: string
      endsAt: string
      departureAt: string
      arrivalAt: string
      price: number
      capacity: number | null
      allowOverCapacity: boolean
      allowLateRegistrations: boolean
      active: boolean
      coverFile: File | null
      galleryFiles: File[]
    } }
  | { success: false; error: string } {
  const title = ((formData.get('title') as string | null) ?? '').trim()
  const slug = ((formData.get('slug') as string | null) ?? '').trim()
  const summary = ((formData.get('summary') as string | null) ?? '').trim() || null
  const description = ((formData.get('description') as string | null) ?? '').trim() || null
  const location = ((formData.get('location') as string | null) ?? '').trim() || null
  const startsAt = ((formData.get('starts_at') as string | null) ?? '').trim()
  const endsAt = ((formData.get('ends_at') as string | null) ?? '').trim()
  const departureAt = ((formData.get('departure_at') as string | null) ?? '').trim()
  const arrivalAt = ((formData.get('arrival_at') as string | null) ?? '').trim()
  const price = Number(formData.get('price') ?? 0)
  const capacityRaw = ((formData.get('capacity') as string | null) ?? '').trim()
  const capacity = capacityRaw ? Number(capacityRaw) : null
  const allowOverCapacity = formData.get('allow_over_capacity') === 'on'
  const allowLateRegistrations = formData.get('allow_late_registrations') === 'on'
  const active = formData.get('active') !== 'false'
  const coverCandidate = formData.get('cover_image')
  const coverFile = coverCandidate instanceof File && coverCandidate.size > 0 ? coverCandidate : null
  const galleryFiles = formData
    .getAll('gallery_images')
    .filter((item): item is File => item instanceof File && item.size > 0)

  if (!title || !startsAt || !endsAt || !departureAt || !arrivalAt) {
    return { success: false, error: 'Preencha titulo, periodo de inscricao, saida e chegada da trip.' }
  }

  if (!Number.isFinite(price) || price < 0) {
    return { success: false, error: 'Informe um valor valido para a trip.' }
  }

  if (capacity !== null && (!Number.isFinite(capacity) || capacity < 1)) {
    return { success: false, error: 'A capacidade precisa ser vazia ou maior que zero.' }
  }

  if (new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
    return { success: false, error: 'A data final precisa ser posterior ao inicio.' }
  }

  if (new Date(arrivalAt).getTime() < new Date(departureAt).getTime()) {
    return { success: false, error: 'A chegada precisa ser posterior a saida.' }
  }

  const files = [coverFile, ...galleryFiles].filter(Boolean) as File[]
  for (const file of files) {
    if (!IMAGE_TYPES.includes(file.type)) {
      return { success: false, error: 'Use apenas imagens JPG, PNG ou WEBP.' }
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return { success: false, error: 'Cada imagem da trip deve ter no maximo 4 MB.' }
    }
  }

  return {
    success: true,
    data: {
      title,
      slug,
      summary,
      description,
      location,
      startsAt,
      endsAt,
      departureAt,
      arrivalAt,
      price,
      capacity,
      allowOverCapacity,
      allowLateRegistrations,
      active,
      coverFile,
      galleryFiles,
    },
  }
}

async function buildUniqueTripSlug(
  admin: ReturnType<typeof createAdminClient>,
  schoolId: string,
  source: string,
  currentTripId?: string,
) {
  const base = slugify(source) || `trip-${Date.now().toString().slice(-6)}`
  let slug = base
  let attempt = 1

  while (true) {
    let query = admin
      .from('trips')
      .select('id')
      .eq('school_id', schoolId)
      .eq('slug', slug)

    if (currentTripId) query = query.neq('id', currentTripId)

    const { data } = await query.maybeSingle()
    if (!data) return slug

    attempt += 1
    slug = `${base}-${attempt}`
  }
}

async function syncTripMedia(input: {
  admin: ReturnType<typeof createAdminClient>
  schoolId: string
  tripId: string
  coverFile: File | null
  galleryFiles: File[]
  replaceGallery: boolean
}): Promise<ActionResult> {
  await ensurePublicBucket(SCHOOL_ASSETS_BUCKET)
  const baseFolder = `schools/${input.schoolId}/trips/${input.tripId}`

  if (input.coverFile) {
    const coverPath = `${baseFolder}/cover-${Date.now()}.${getFileExtension(input.coverFile.name)}`
    const { data: oldFiles } = await input.admin.storage.from(SCHOOL_ASSETS_BUCKET).list(baseFolder, { limit: 100 })
    const oldCoverPaths = (oldFiles ?? [])
      .filter((file) => file.name.startsWith('cover-'))
      .map((file) => `${baseFolder}/${file.name}`)

    if (oldCoverPaths.length > 0) {
      await input.admin.storage.from(SCHOOL_ASSETS_BUCKET).remove(oldCoverPaths)
    }

    const { error: uploadError } = await input.admin.storage
      .from(SCHOOL_ASSETS_BUCKET)
      .upload(coverPath, input.coverFile, {
        upsert: true,
        contentType: input.coverFile.type,
        cacheControl: '3600',
      })

    if (uploadError) return { success: false, error: uploadError.message }

    const { data: publicFile } = input.admin.storage.from(SCHOOL_ASSETS_BUCKET).getPublicUrl(coverPath)
    const { error: coverUpdateError } = await input.admin
      .from('trips')
      .update({ cover_image_url: publicFile.publicUrl })
      .eq('id', input.tripId)

    if (coverUpdateError) return { success: false, error: coverUpdateError.message }
  }

  if (input.replaceGallery) {
    const galleryFolder = `${baseFolder}/gallery`
    const { data: oldGallery } = await input.admin.storage.from(SCHOOL_ASSETS_BUCKET).list(galleryFolder, { limit: 100 })

    if ((oldGallery ?? []).length > 0) {
      await input.admin.storage
        .from(SCHOOL_ASSETS_BUCKET)
        .remove(oldGallery!.map((file) => `${galleryFolder}/${file.name}`))
    }

    const { error: deleteImagesError } = await input.admin
      .from('trip_images')
      .delete()
      .eq('trip_id', input.tripId)

    if (deleteImagesError) return { success: false, error: deleteImagesError.message }

    const uploadedUrls: Array<{ image_url: string; sort_order: number }> = []
    for (const [index, file] of input.galleryFiles.entries()) {
      const path = `${galleryFolder}/${index + 1}-${Date.now()}.${getFileExtension(file.name)}`
      const { error: uploadError } = await input.admin.storage
        .from(SCHOOL_ASSETS_BUCKET)
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600',
        })

      if (uploadError) return { success: false, error: uploadError.message }
      const { data: publicFile } = input.admin.storage.from(SCHOOL_ASSETS_BUCKET).getPublicUrl(path)
      uploadedUrls.push({ image_url: publicFile.publicUrl, sort_order: index })
    }

    if (uploadedUrls.length > 0) {
      const { error: insertImagesError } = await input.admin
        .from('trip_images')
        .insert(uploadedUrls.map((image) => ({ ...image, trip_id: input.tripId })))

      if (insertImagesError) return { success: false, error: insertImagesError.message }
    }
  }

  return { success: true, data: undefined }
}

function getFileExtension(name: string) {
  return name.includes('.') ? name.split('.').pop()?.toLowerCase() ?? 'jpg' : 'jpg'
}
