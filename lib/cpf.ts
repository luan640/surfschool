export const CPF_INPUT_MAX_LENGTH = 14

export function normalizeCpf(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '').slice(0, 11)
}

export function formatCpf(value: string | null | undefined) {
  const digits = normalizeCpf(value)
  const parts = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 9),
    digits.slice(9, 11),
  ]

  if (digits.length <= 3) return parts[0]
  if (digits.length <= 6) return `${parts[0]}.${parts[1]}`
  if (digits.length <= 9) return `${parts[0]}.${parts[1]}.${parts[2]}`
  return `${parts[0]}.${parts[1]}.${parts[2]}-${parts[3]}`
}

export function isValidCpf(value: string | null | undefined) {
  const digits = normalizeCpf(value)
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false

  let sum = 0
  for (let index = 0; index < 9; index += 1) {
    sum += Number(digits[index]) * (10 - index)
  }

  let checkDigit = (sum * 10) % 11
  if (checkDigit === 10) checkDigit = 0
  if (checkDigit !== Number(digits[9])) return false

  sum = 0
  for (let index = 0; index < 10; index += 1) {
    sum += Number(digits[index]) * (11 - index)
  }

  checkDigit = (sum * 10) % 11
  if (checkDigit === 10) checkDigit = 0
  return checkDigit === Number(digits[10])
}

export function validateCpfField(value: string | null | undefined, label = 'CPF') {
  const normalized = normalizeCpf(value)
  if (!normalized) {
    return { value: null, error: `${label} e obrigatorio.` }
  }

  if (!isValidCpf(normalized)) {
    return { value: null, error: `${label} invalido.` }
  }

  return { value: normalized, error: null }
}
