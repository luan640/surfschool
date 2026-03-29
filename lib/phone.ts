const PHONE_MIN_DIGITS = 7
const PHONE_MAX_DIGITS = 15

function sanitizePhoneInput(value: string | null | undefined) {
  const raw = (value ?? '').trim()
  const hasPlus = raw.startsWith('+')
  const digits = raw.replace(/\D/g, '').slice(0, PHONE_MAX_DIGITS)

  return {
    raw,
    hasPlus,
    digits,
  }
}

export function getPhoneDigits(value: string | null | undefined) {
  return sanitizePhoneInput(value).digits
}

export function formatPhone(value: string | null | undefined) {
  const { digits, hasPlus } = sanitizePhoneInput(value)
  if (!digits) return ''
  return `${hasPlus ? '+' : ''}${digits}`
}

export function normalizePhone(value: string | null | undefined) {
  const formatted = formatPhone(value)
  return formatted || null
}

export function isValidPhone(value: string | null | undefined) {
  const { digits } = sanitizePhoneInput(value)
  return digits.length >= PHONE_MIN_DIGITS && digits.length <= PHONE_MAX_DIGITS
}

export function validatePhoneField(
  value: string | null | undefined,
  label: string,
  options?: { required?: boolean },
) {
  const { raw } = sanitizePhoneInput(value)
  const normalized = normalizePhone(value)

  if (!normalized) {
    if (raw) return { value: null, error: `${label} deve conter apenas numeros e um + opcional no inicio.` }
    if (options?.required) return { value: null, error: `${label} e obrigatorio.` }
    return { value: null, error: null }
  }

  if (!isValidPhone(value)) {
    return { value: null, error: `${label} deve ter entre ${PHONE_MIN_DIGITS} e ${PHONE_MAX_DIGITS} digitos.` }
  }

  return { value: normalized, error: null }
}

export const PHONE_INPUT_MAX_LENGTH = PHONE_MAX_DIGITS + 1
