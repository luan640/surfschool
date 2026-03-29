'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getInstructors, getMySchool } from '@/actions/instructors'
import type { ActionResult, Instructor, InstructorCommissionPayment } from '@/lib/types'

export async function getCommissionPaymentPageData(): Promise<{
  instructors: Instructor[]
  payments: InstructorCommissionPayment[]
}> {
  const supabase = await createClient()
  const school = await getMySchool()

  if (!school) {
    return { instructors: [], payments: [] }
  }

  const [instructors, { data: payments }] = await Promise.all([
    getInstructors(),
    supabase
      .from('instructor_commission_payments')
      .select(`
        *,
        instructor:instructors(id, full_name, color, photo_url)
      `)
      .eq('school_id', school.id)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  return {
    instructors,
    payments: (payments ?? []) as InstructorCommissionPayment[],
  }
}

export async function createCommissionPayment(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const school = await getMySchool()

  if (!school) return { success: false, error: 'Nao autorizado' }

  const instructorId = (formData.get('instructor_id') as string | null)?.trim() ?? ''
  const paymentDate = (formData.get('payment_date') as string | null)?.trim() ?? ''
  const notes = (formData.get('notes') as string | null)?.trim() ?? ''
  const amount = Number(formData.get('amount'))

  if (!instructorId) return { success: false, error: 'Selecione o instrutor.' }
  if (!paymentDate) return { success: false, error: 'Informe a data do pagamento.' }
  if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'Informe um valor valido para a comissao.' }

  const { data: instructor } = await supabase
    .from('instructors')
    .select('id')
    .eq('id', instructorId)
    .eq('school_id', school.id)
    .maybeSingle()

  if (!instructor) return { success: false, error: 'Instrutor invalido para esta escola.' }

  const { error } = await supabase
    .from('instructor_commission_payments')
    .insert({
      school_id: school.id,
      instructor_id: instructorId,
      amount,
      payment_date: paymentDate,
      notes: notes || null,
    })

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/commission-payments')
  return { success: true, data: undefined }
}
