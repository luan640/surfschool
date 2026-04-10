'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getMySchool } from './instructors'
import type { ActionResult, DiscountCoupon, LessonPackage } from '@/lib/types'

export async function getDiscountCoupons(): Promise<DiscountCoupon[]> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  const { data } = await supabase
    .from('discount_coupons')
    .select(`
      *,
      packages:discount_coupon_packages(
        package:lesson_packages(id, name, active)
      )
    `)
    .eq('school_id', school.id)
    .order('created_at', { ascending: false })

  return mapCoupons(data)
}

export async function getDiscountCouponById(id: string): Promise<DiscountCoupon | null> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return null

  const { data } = await supabase
    .from('discount_coupons')
    .select(`
      *,
      packages:discount_coupon_packages(
        package:lesson_packages(id, name, active)
      )
    `)
    .eq('school_id', school.id)
    .eq('id', id)
    .maybeSingle()

  const [coupon] = mapCoupons(data ? [data] : null)
  return coupon ?? null
}

export async function getCouponEligiblePackages(): Promise<Pick<LessonPackage, 'id' | 'name' | 'active'>[]> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return []

  const { data } = await supabase
    .from('lesson_packages')
    .select('id, name, active')
    .eq('school_id', school.id)
    .order('name', { ascending: true })

  return (data ?? []) as Pick<LessonPackage, 'id' | 'name' | 'active'>[]
}

export async function createDiscountCoupon(formData: FormData): Promise<ActionResult<DiscountCoupon>> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const payload = parseCouponFormData(formData)
  if (!payload.success) return payload

  const { data, error } = await supabase
    .from('discount_coupons')
    .insert({
      school_id: school.id,
      ...payload.data.coupon,
    })
    .select()
    .single()

  if (error || !data) {
    return {
      success: false,
      error: error?.message.includes('discount_coupons_code_unique')
        ? 'Ja existe um cupom com este codigo.'
        : error?.message ?? 'Não foi possível criar o cupom.',
    }
  }

  const scopeResult = await replaceCouponPackages(supabase, data.id, payload.data.packageIds)
  if (!scopeResult.success) return scopeResult

  revalidatePath('/dashboard/coupons')
  return { success: true, data: data as DiscountCoupon }
}

export async function updateDiscountCoupon(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const payload = parseCouponFormData(formData)
  if (!payload.success) return payload

  const { error } = await supabase
    .from('discount_coupons')
    .update(payload.data.coupon)
    .eq('school_id', school.id)
    .eq('id', id)

  if (error) {
    return {
      success: false,
      error: error.message.includes('discount_coupons_code_unique')
        ? 'Ja existe um cupom com este codigo.'
        : error.message,
    }
  }

  const scopeResult = await replaceCouponPackages(supabase, id, payload.data.packageIds)
  if (!scopeResult.success) return scopeResult

  revalidatePath('/dashboard/coupons')
  revalidatePath(`/dashboard/coupons/${id}`)
  return { success: true, data: undefined }
}

export async function deleteDiscountCoupon(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) return { success: false, error: 'Nao autorizado' }

  const { error } = await supabase
    .from('discount_coupons')
    .delete()
    .eq('school_id', school.id)
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/coupons')
  return { success: true, data: undefined }
}

function parseCouponFormData(formData: FormData):
  | { success: true; data: { coupon: Omit<DiscountCoupon, 'id' | 'school_id' | 'created_at' | 'updated_at' | 'packages'>; packageIds: string[] } }
  | { success: false; error: string } {
  const code = ((formData.get('code') as string | null) ?? '').trim().toUpperCase()
  const name = ((formData.get('name') as string | null) ?? '').trim()
  const description = ((formData.get('description') as string | null) ?? '').trim() || null
  const appliesToSingleLesson = formData.get('applies_to_single_lesson') === 'true'
  const discountType = formData.get('discount_type') as 'percentage' | 'fixed' | null
  const discountValue = Number(formData.get('discount_value'))
  const minOrderAmount = parseOptionalNumber(formData.get('min_order_amount'))
  const usageLimitTotal = parseOptionalInteger(formData.get('usage_limit_total'))
  const usageLimitPerUser = parseOptionalInteger(formData.get('usage_limit_per_user'))
  const startsAt = parseOptionalDateTime(formData.get('starts_at'))
  const endsAt = parseOptionalDateTime(formData.get('ends_at'))
  const active = formData.get('active') !== 'false'
  const packageIds = Array.from(new Set(formData.getAll('package_ids').map(String).filter(Boolean)))

  if (!code) return { success: false, error: 'Informe o codigo do cupom.' }
  if (!/^[A-Z0-9_-]+$/.test(code)) return { success: false, error: 'Use apenas letras, numeros, traço e underscore no codigo.' }
  if (!name) return { success: false, error: 'Informe o nome do cupom.' }
  if (!appliesToSingleLesson && packageIds.length === 0) return { success: false, error: 'Selecione pelo menos um servico para o cupom.' }
  if (discountType !== 'percentage' && discountType !== 'fixed') return { success: false, error: 'Selecione o tipo de desconto.' }
  if (!Number.isFinite(discountValue) || discountValue <= 0) return { success: false, error: 'Informe um valor de desconto valido.' }
  if (discountType === 'percentage' && discountValue > 100) return { success: false, error: 'O desconto percentual nao pode passar de 100%.' }
  if (usageLimitTotal !== null && usageLimitTotal <= 0) return { success: false, error: 'O limite total de uso deve ser maior que zero.' }
  if (usageLimitPerUser !== null && usageLimitPerUser <= 0) return { success: false, error: 'O limite por usuario deve ser maior que zero.' }
  if (startsAt && endsAt && new Date(startsAt).getTime() > new Date(endsAt).getTime()) {
    return { success: false, error: 'A vigencia inicial nao pode ser maior que a data limite.' }
  }

  return {
    success: true,
    data: {
      coupon: {
        code,
        name,
        description,
        applies_to_single_lesson: appliesToSingleLesson,
        discount_type: discountType,
        discount_value: discountValue,
        min_order_amount: minOrderAmount,
        usage_limit_total: usageLimitTotal,
        usage_limit_per_user: usageLimitPerUser,
        starts_at: startsAt,
        ends_at: endsAt,
        active,
      },
      packageIds,
    },
  }
}

function parseOptionalNumber(value: FormDataEntryValue | null) {
  const parsed = Number(value)
  return value === null || value === '' || !Number.isFinite(parsed) ? null : parsed
}

function parseOptionalInteger(value: FormDataEntryValue | null) {
  const parsed = Number(value)
  return value === null || value === '' || !Number.isFinite(parsed) ? null : Math.trunc(parsed)
}

function parseOptionalDateTime(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value) return null
  return new Date(value).toISOString()
}

async function replaceCouponPackages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  couponId: string,
  packageIds: string[],
): Promise<ActionResult> {
  const { error: deleteError } = await supabase
    .from('discount_coupon_packages')
    .delete()
    .eq('coupon_id', couponId)

  if (deleteError) return { success: false, error: deleteError.message }

  if (packageIds.length === 0) {
    return { success: true, data: undefined }
  }

  const { error: insertError } = await supabase
    .from('discount_coupon_packages')
    .insert(packageIds.map((packageId) => ({ coupon_id: couponId, package_id: packageId })))

  if (insertError) return { success: false, error: insertError.message }

  return { success: true, data: undefined }
}

function mapCoupons(data: any[] | null): DiscountCoupon[] {
  return (data ?? []).map((item) => ({
    ...item,
    packages: (item.packages ?? [])
      .map((row: any) => row.package)
      .filter(Boolean),
  })) as DiscountCoupon[]
}
