type JsonRecord = Record<string, unknown>

export interface PaymentFinancialBreakdown {
  gross: number
  fee: number
  net: number
}

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function getPaymentPayload(payload: unknown) {
  const record = asRecord(payload)
  if (!record) return null

  const nestedPayment = asRecord(record.payment)
  return nestedPayment ?? record
}

export function getPaymentFinancialBreakdown(payload: unknown, fallbackGross = 0): PaymentFinancialBreakdown {
  const payment = getPaymentPayload(payload)
  const gross = asNumber(payment?.transaction_amount) ?? fallbackGross

  const feeDetails = Array.isArray(payment?.fee_details)
    ? payment.fee_details.reduce((sum, item) => {
        const amount = asNumber(asRecord(item)?.amount)
        return sum + (amount ?? 0)
      }, 0)
    : 0

  const netReceived = asNumber(asRecord(payment?.transaction_details)?.net_received_amount)
  const fee = feeDetails > 0
    ? feeDetails
    : netReceived !== null
      ? Math.max(0, gross - netReceived)
      : 0
  const net = netReceived ?? Math.max(0, gross - fee)

  return {
    gross: Number(gross.toFixed(2)),
    fee: Number(fee.toFixed(2)),
    net: Number(net.toFixed(2)),
  }
}

export function emptyFinancialBreakdown(): PaymentFinancialBreakdown {
  return { gross: 0, fee: 0, net: 0 }
}

export function addFinancialBreakdown(
  current: PaymentFinancialBreakdown,
  next: PaymentFinancialBreakdown,
): PaymentFinancialBreakdown {
  return {
    gross: Number((current.gross + next.gross).toFixed(2)),
    fee: Number((current.fee + next.fee).toFixed(2)),
    net: Number((current.net + next.net).toFixed(2)),
  }
}
