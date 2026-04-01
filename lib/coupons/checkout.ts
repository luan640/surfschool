import { createAdminClient } from '@/lib/supabase/admin'

export interface ValidatedCheckoutCoupon {
  id: string
  code: string
  name: string
  discountAmount: number
  finalAmount: number
}

export async function validateCheckoutCoupon(params: {
  schoolId: string
  studentId: string
  selectionType: 'single' | 'package'
  packageId?: string | null
  amount: number
  code: string
}) {
  const admin = createAdminClient()
  const normalizedCode = params.code.trim().toUpperCase()

  if (!normalizedCode) {
    return { success: false as const, error: 'Informe um cupom.' }
  }

  const { data: coupon, error: couponError } = await admin
    .from('discount_coupons')
    .select('*')
    .eq('school_id', params.schoolId)
    .eq('code', normalizedCode)
    .eq('active', true)
    .maybeSingle()

  if (couponError) return { success: false as const, error: couponError.message }
  if (!coupon) return { success: false as const, error: 'Cupom invalido.' }

  const now = Date.now()
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
    return { success: false as const, error: 'Este cupom ainda nao esta ativo.' }
  }
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) {
    return { success: false as const, error: 'Este cupom expirou.' }
  }

  if (coupon.min_order_amount !== null && Number(params.amount) < Number(coupon.min_order_amount)) {
    return { success: false as const, error: 'Este cupom exige um valor minimo para uso.' }
  }

  if (params.selectionType === 'single') {
    if (!coupon.applies_to_single_lesson) {
      return { success: false as const, error: 'Este cupom nao vale para aula avulsa.' }
    }
  } else {
    if (!params.packageId) {
      return { success: false as const, error: 'Pacote invalido para aplicar o cupom.' }
    }

    const { data: scopedPackage, error: scopeError } = await admin
      .from('discount_coupon_packages')
      .select('package_id')
      .eq('coupon_id', coupon.id)
      .eq('package_id', params.packageId)
      .maybeSingle()

    if (scopeError) return { success: false as const, error: scopeError.message }
    if (!scopedPackage) {
      return { success: false as const, error: 'Este cupom nao vale para o pacote selecionado.' }
    }
  }

  if (coupon.usage_limit_total !== null) {
    const { count, error } = await admin
      .from('discount_coupon_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)

    if (error) return { success: false as const, error: error.message }
    if ((count ?? 0) >= coupon.usage_limit_total) {
      return { success: false as const, error: 'Este cupom atingiu o limite total de usos.' }
    }
  }

  if (coupon.usage_limit_per_user !== null) {
    const { count, error } = await admin
      .from('discount_coupon_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('coupon_id', coupon.id)
      .eq('student_id', params.studentId)

    if (error) return { success: false as const, error: error.message }
    if ((count ?? 0) >= coupon.usage_limit_per_user) {
      return { success: false as const, error: 'Este cupom ja atingiu o limite de uso para este aluno.' }
    }
  }

  const grossAmount = Number(params.amount)
  const rawDiscount = coupon.discount_type === 'percentage'
    ? grossAmount * (Number(coupon.discount_value) / 100)
    : Number(coupon.discount_value)
  const discountAmount = Number(Math.min(grossAmount, rawDiscount).toFixed(2))
  const finalAmount = Number(Math.max(0, grossAmount - discountAmount).toFixed(2))

  return {
    success: true as const,
    data: {
      id: coupon.id as string,
      code: coupon.code as string,
      name: coupon.name as string,
      discountAmount,
      finalAmount,
    } satisfies ValidatedCheckoutCoupon,
  }
}

export async function createCouponRedemption(params: {
  couponId: string
  schoolId: string
  studentId: string
  bookingId: string | null
  appliedCode: string
  discountAmount: number
}) {
  const admin = createAdminClient()
  const { error } = await admin
    .from('discount_coupon_redemptions')
    .insert({
      coupon_id: params.couponId,
      school_id: params.schoolId,
      student_id: params.studentId,
      booking_id: params.bookingId,
      applied_code: params.appliedCode,
      discount_amount: params.discountAmount,
    })

  if (error) throw new Error(error.message)
}
