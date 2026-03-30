'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ensurePublicBucket } from '@/lib/supabase/storage'
import { validatePhoneField } from '@/lib/phone'
import { formatTripPaymentMethodLabel } from '@/lib/trips'
import { slugify } from '@/lib/utils'
import { getMySchool } from './instructors'
import type { ActionResult, PaymentMethod, Trip, TripImage, TripRegistration } from '@/lib/types'

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

export async function getTripRegistrations(tripId: string): Promise<TripRegistration[]> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  const { data } = await supabase
    .from('trip_registrations')
    .select('*')
    .eq('school_id', school.id)
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })

  return (data ?? []) as TripRegistration[]
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

export async function createManualTripRegistration(tripId: string, formData: FormData): Promise<ActionResult> {
  const admin = createAdminClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const payload = parseManualTripRegistrationFormData(formData)
  if (!payload.success) return payload

  const { data: trip, error: tripError } = await admin
    .from('trips')
    .select('id, school_id, title, price, capacity, allow_over_capacity, allow_late_registrations, ends_at, active')
    .eq('school_id', school.id)
    .eq('id', tripId)
    .maybeSingle()

  if (tripError || !trip) {
    return { success: false, error: tripError?.message ?? 'Trip nao encontrada.' }
  }

  if (!trip.active) {
    return { success: false, error: 'Ative a trip antes de registrar pessoas manualmente.' }
  }

  if (!trip.allow_late_registrations && new Date(trip.ends_at).getTime() < Date.now()) {
    return { success: false, error: 'As inscricoes para esta trip ja foram encerradas.' }
  }

  if (trip.capacity && !trip.allow_over_capacity) {
    const { count } = await admin
      .from('trip_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', trip.id)
      .eq('payment_status', 'paid')

    if ((count ?? 0) >= trip.capacity) {
      return { success: false, error: 'As vagas desta trip se encerraram.' }
    }
  }

  const { error } = await admin
    .from('trip_registrations')
    .insert({
      trip_id: trip.id,
      school_id: school.id,
      full_name: payload.data.fullName,
      email: payload.data.email,
      phone: payload.data.phone,
      notes: payload.data.notes,
      status: 'confirmed',
      payment_status: 'paid',
      payment_method: payload.data.paymentMethod,
      amount: payload.data.amount,
      mercadopago_status_detail: `Pagamento presencial registrado manualmente via ${formatTripPaymentMethodLabel(payload.data.paymentMethod)}.`,
    })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/trips')
  revalidatePath(`/dashboard/trips/${trip.id}`)
  revalidatePath('/dashboard/sales-history')
  return { success: true, data: undefined }
}

export async function updateManualTripRegistration(registrationId: string, formData: FormData): Promise<ActionResult> {
  const admin = createAdminClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const payload = parseManualTripRegistrationFormData(formData)
  if (!payload.success) return payload

  const { data: registration, error: registrationError } = await admin
    .from('trip_registrations')
    .select('id, trip_id, school_id, external_reference, mercadopago_payment_id')
    .eq('school_id', school.id)
    .eq('id', registrationId)
    .maybeSingle()

  if (registrationError || !registration) {
    return { success: false, error: registrationError?.message ?? 'Inscricao nao encontrada.' }
  }

  if (registration.external_reference || registration.mercadopago_payment_id) {
    return { success: false, error: 'So inscricoes registradas manualmente podem ser editadas por aqui.' }
  }

  const { error } = await admin
    .from('trip_registrations')
    .update({
      full_name: payload.data.fullName,
      email: payload.data.email,
      phone: payload.data.phone,
      notes: payload.data.notes,
      payment_method: payload.data.paymentMethod,
      amount: payload.data.amount,
      mercadopago_status_detail: `Pagamento presencial registrado manualmente via ${formatTripPaymentMethodLabel(payload.data.paymentMethod)}.`,
    })
    .eq('id', registration.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/trips')
  revalidatePath(`/dashboard/trips/${registration.trip_id}`)
  revalidatePath('/dashboard/sales-history')
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

function parseManualTripRegistrationFormData(formData: FormData):
  | { success: true; data: {
      fullName: string
      email: string
      phone: string | null
      notes: string | null
      paymentMethod: PaymentMethod
      amount: number
    } }
  | { success: false; error: string } {
  const fullName = ((formData.get('full_name') as string | null) ?? '').trim()
  const email = ((formData.get('email') as string | null) ?? '').trim().toLowerCase()
  const notes = ((formData.get('notes') as string | null) ?? '').trim() || null
  const paymentMethod = ((formData.get('payment_method') as string | null) ?? '').trim() as PaymentMethod
  const amount = Number(formData.get('amount') ?? 0)
  const phoneValue = formData.get('phone')
  const phoneResult = validatePhoneField(typeof phoneValue === 'string' ? phoneValue : null, 'Telefone')

  if (!fullName || !email) {
    return { success: false, error: 'Preencha nome completo e e-mail.' }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Informe um e-mail valido.' }
  }

  if (phoneResult.error) {
    return { success: false, error: phoneResult.error }
  }

  if (!['pix', 'credit_card', 'debit_card', 'cash'].includes(paymentMethod)) {
    return { success: false, error: 'Selecione uma forma de pagamento valida.' }
  }

  if (!Number.isFinite(amount) || amount < 0) {
    return { success: false, error: 'Informe um valor pago valido.' }
  }

  return {
    success: true,
    data: {
      fullName,
      email,
      phone: phoneResult.value,
      notes,
      paymentMethod,
      amount: Number(amount.toFixed(2)),
    },
  }
}
