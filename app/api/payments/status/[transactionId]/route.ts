import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPaymentTransactionForStudent } from '@/lib/payments/payment-store'

interface RouteContext {
  params: Promise<{ transactionId: string }>
}

export async function GET(_: Request, { params }: RouteContext) {
  const { transactionId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return NextResponse.json({ error: 'Sessao invalida.' }, { status: 401 })
  }

  const transaction = await getPaymentTransactionForStudent(transactionId, user.id)
  if (!transaction) {
    return NextResponse.json({ error: 'Transacao nao encontrada.' }, { status: 404 })
  }

  return NextResponse.json(transaction, { status: 200 })
}
