import type { PaymentMethod } from '@/lib/types'

export function formatTripPaymentMethodLabel(paymentMethod: PaymentMethod | null | undefined) {
  switch (paymentMethod) {
    case 'pix':
      return 'Pix'
    case 'credit_card':
      return 'Cartao de credito'
    case 'debit_card':
      return 'Cartao de debito'
    case 'cash':
      return 'Dinheiro'
    default:
      return 'Nao informado'
  }
}
