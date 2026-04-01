import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateCheckoutCoupon } from '@/lib/coupons/checkout'

interface ValidateCouponRequestBody {
  schoolId: string
  selectionType: 'single' | 'package'
  packageId?: string | null
  amount: number
  code: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ValidateCouponRequestBody
    if (!body.schoolId || !body.selectionType || !body.code) {
      return NextResponse.json({ error: 'Payload invalido.' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id) {
      return NextResponse.json({ error: 'Sessao invalida.' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: student, error: studentError } = await admin
      .from('student_profiles')
      .select('id')
      .eq('school_id', body.schoolId)
      .eq('user_id', user.id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Aluno nao encontrado para esta escola.' }, { status: 403 })
    }

    const result = await validateCheckoutCoupon({
      schoolId: body.schoolId,
      studentId: student.id as string,
      selectionType: body.selectionType,
      packageId: body.packageId ?? null,
      amount: Number(body.amount),
      code: body.code,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Nao foi possivel validar o cupom.' },
      { status: 500 },
    )
  }
}
