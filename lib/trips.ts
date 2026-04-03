import type { PaymentMethod } from '@/lib/types'

export function formatTripPaymentMethodLabel(paymentMethod: PaymentMethod | null | undefined) {
  switch (paymentMethod) {
    case 'pix':
      return 'Pix'
    case 'credit_card':
      return 'Cartão de crédito'
    case 'debit_card':
      return 'Cartão de debito'
    case 'cash':
      return 'Dinheiro'
    default:
      return 'Nao informado'
  }
}
