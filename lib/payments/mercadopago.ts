import crypto from 'node:crypto'
import { MercadoPagoConfig, Payment, PaymentRefund } from 'mercadopago'
import type { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes'
import type { PaymentCreateRequest } from 'mercadopago/dist/clients/payment/create/types'
import { createAdminClient } from '@/lib/supabase/admin'

export type CheckoutSelectionType = 'single' | 'package'
export type PaymentProviderStatus = 'connected' | 'expired' | 'revoked' | 'error' | 'disconnected'

export interface CheckoutBookingContext {
  schoolId: string
  schoolName: string
  schoolSlug: string
  studentId: string
  studentName: string
  studentEmail: string
  instructorId: string
  instructorName: string
  paymentMethod: 'pix' | 'credit_card'
  amount: number
  selectionType: CheckoutSelectionType
  bookingIds: string[]
  packageId?: string | null
  packageName?: string | null
  studentPackageId?: string | null
}

export interface CheckoutBrickPayload {
  paymentType?: string
  selectedPaymentMethod?: string
  formData: {
    token?: string
    issuer_id?: string
    payment_method_id?: string
    transaction_amount?: number
    installments?: number
    payer?: {
      email?: string
      firstName?: string
      lastName?: string
      identification?: { type?: string; number?: string }
    }
    payment_method_option_id?: string
    processing_mode?: string
    transaction_details?: { financial_institution?: string }
    additional_info?: {
      items?: Array<{ title: string; quantity: number; unit_price: number; description?: string }>
    }
  }
  additionalData?: {
    bin?: string
    lastFourDigits?: string
    paymentTypeId?: string
  } | null
}

export interface MercadoPagoOAuthTokenResponse {
  access_token: string
  public_key?: string
  refresh_token: string
  live_mode?: boolean
  user_id: number
  token_type?: string
  expires_in: number
  scope?: string
}

export interface PaymentProviderConnectionRecord {
  id: string
  school_id: string
  provider: 'mercadopago'
  mp_user_id: string | null
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  status: PaymentProviderStatus
  last_error: string | null
  connected_at: string | null
  updated_at: string
}

interface OAuthStatePayload {
  schoolId: string
  ownerId: string
  ts: number
  nonce: string
}

export type LocalPaymentStatus = 'pending' | 'paid' | 'failed'

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000

export function getMercadoPagoPublicKey() {
  const key = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY
  if (!key) throw new Error('NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY is not configured.')
  return key
}

export function getPublicAppBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.MERCADOPAGO_WEBHOOK_BASE_URL
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL or MERCADOPAGO_WEBHOOK_BASE_URL must be configured.')
  }

  return baseUrl.replace(/\/$/, '')
}

function getMercadoPagoOAuthConfig() {
  const clientId = process.env.MERCADOPAGO_CLIENT_ID
  const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET
  const redirectUri = process.env.MERCADOPAGO_OAUTH_REDIRECT_URI
  const testToken = process.env.MERCADOPAGO_OAUTH_TEST_TOKEN === 'true'

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Mercado Pago OAuth env vars are not fully configured. Check MERCADOPAGO_CLIENT_ID, MERCADOPAGO_CLIENT_SECRET and MERCADOPAGO_OAUTH_REDIRECT_URI.')
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    testToken,
  }
}

export function createMercadoPagoPaymentClient(accessToken: string) {
  return new Payment(new MercadoPagoConfig({ accessToken }))
}

export function createMercadoPagoRefundClient(accessToken: string) {
  return new PaymentRefund(new MercadoPagoConfig({ accessToken }))
}

export function createExternalReference(prefix: CheckoutSelectionType) {
  return `surfbook:${prefix}:${crypto.randomUUID()}`
}

export function normalizeMercadoPagoAmount(value: number) {
  return Number(value.toFixed(2))
}

export function buildWebhookNotificationUrl(schoolId: string) {
  const baseUrl = process.env.MERCADOPAGO_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) throw new Error('MERCADOPAGO_WEBHOOK_BASE_URL or NEXT_PUBLIC_APP_URL must be configured.')

  return `${baseUrl.replace(/\/$/, '')}/api/payments/webhooks/mercadopago?school_id=${encodeURIComponent(schoolId)}`
}

export function buildMercadoPagoAuthorizationUrl(input: { schoolId: string; ownerId: string }) {
  const { clientId, redirectUri } = getMercadoPagoOAuthConfig()
  const state = signMercadoPagoOAuthState({
    schoolId: input.schoolId,
    ownerId: input.ownerId,
    ts: Date.now(),
    nonce: crypto.randomUUID(),
  })

  const url = new URL('https://auth.mercadopago.com.br/authorization')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('platform_id', 'mp')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)

  return { url: url.toString(), state }
}

export function signMercadoPagoOAuthState(payload: OAuthStatePayload) {
  const { clientSecret } = getMercadoPagoOAuthConfig()
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = crypto.createHmac('sha256', clientSecret).update(encodedPayload).digest('base64url')
  return `${encodedPayload}.${signature}`
}

export function verifyMercadoPagoOAuthState(state: string) {
  const { clientSecret } = getMercadoPagoOAuthConfig()
  const [encodedPayload, signature] = state.split('.')
  if (!encodedPayload || !signature) return null

  const expected = crypto.createHmac('sha256', clientSecret).update(encodedPayload).digest('base64url')
  if (expected.length !== signature.length) return null
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null

  const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as OAuthStatePayload
  if (Date.now() - payload.ts > OAUTH_STATE_TTL_MS) return null

  return payload
}

export function buildMercadoPagoOAuthAuthorizationCodeBody(input: { code: string }) {
  const { clientId, clientSecret, redirectUri, testToken } = getMercadoPagoOAuthConfig()
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: redirectUri,
  })

  if (testToken) {
    body.set('test_token', 'true')
  }

  return body
}

export async function exchangeMercadoPagoAuthorizationCode(input: { code: string }) {
  return requestMercadoPagoOAuthToken(buildMercadoPagoOAuthAuthorizationCodeBody({ code: input.code }))
}

export async function refreshMercadoPagoAuthorization(input: { refreshToken: string }) {
  const { clientId, clientSecret, testToken } = getMercadoPagoOAuthConfig()
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: input.refreshToken,
  })

  if (testToken) {
    body.set('test_token', 'true')
  }

  return requestMercadoPagoOAuthToken(body)
}

async function requestMercadoPagoOAuthToken(body: URLSearchParams) {
  const response = await fetch('https://api.mercadopago.com/oauth/token', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const payload = await response.json()
  if (!response.ok) {
    const details = payload.message ?? payload.error_description ?? payload.error ?? 'Não foi possível autenticar no Mercado Pago.'
    throw new Error(`${details} Verifique se a aplicacao esta pronta para OAuth e se o redirect_uri cadastrado bate exatamente com MERCADOPAGO_OAUTH_REDIRECT_URI.`)
  }

  return payload as MercadoPagoOAuthTokenResponse
}

export async function upsertMercadoPagoConnection(input: {
  schoolId: string
  token: MercadoPagoOAuthTokenResponse
}) {
  const admin = createAdminClient()
  const expiresAt = new Date(Date.now() + input.token.expires_in * 1000).toISOString()

  const { error } = await admin
    .from('payment_provider_connections')
    .upsert({
      school_id: input.schoolId,
      provider: 'mercadopago',
      mp_user_id: String(input.token.user_id),
      access_token: input.token.access_token,
      refresh_token: input.token.refresh_token,
      expires_at: expiresAt,
      status: 'connected',
      last_error: null,
      connected_at: new Date().toISOString(),
    }, { onConflict: 'school_id,provider' })

  if (error) {
    throw new Error(error.message)
  }
}

export async function getMercadoPagoConnection(schoolId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payment_provider_connections')
    .select('*')
    .eq('school_id', schoolId)
    .eq('provider', 'mercadopago')
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data ?? null) as PaymentProviderConnectionRecord | null
}

export async function disconnectMercadoPagoConnection(input: {
  schoolId: string
  status?: PaymentProviderStatus
  lastError?: string | null
}) {
  const admin = createAdminClient()
  const existing = await getMercadoPagoConnection(input.schoolId)

  const query = existing
    ? admin
        .from('payment_provider_connections')
        .update({
          access_token: null,
          refresh_token: null,
          expires_at: null,
          status: input.status ?? 'disconnected',
          last_error: input.lastError ?? null,
        })
        .eq('id', existing.id)
    : admin
        .from('payment_provider_connections')
        .insert({
          school_id: input.schoolId,
          provider: 'mercadopago',
          access_token: null,
          refresh_token: null,
          expires_at: null,
          status: input.status ?? 'disconnected',
          last_error: input.lastError ?? null,
        })

  const { error } = await query

  if (error) throw new Error(error.message)
}

export async function getValidMercadoPagoAccessTokenForSchool(schoolId: string) {
  const connection = await getMercadoPagoConnection(schoolId)
  if (!connection || connection.status === 'disconnected' || !connection.access_token || !connection.refresh_token || !connection.expires_at) {
    return null
  }

  const expiresAt = new Date(connection.expires_at).getTime()
  const shouldRefresh = Number.isNaN(expiresAt) || expiresAt - Date.now() <= REFRESH_THRESHOLD_MS

  if (!shouldRefresh) {
    return connection.access_token
  }

  try {
    const refreshed = await refreshMercadoPagoAuthorization({
      refreshToken: connection.refresh_token,
    })

    await upsertMercadoPagoConnection({
      schoolId,
      token: refreshed,
    })

    return refreshed.access_token
  } catch (error) {
    await disconnectMercadoPagoConnection({
      schoolId,
      status: 'error',
      lastError: error instanceof Error ? error.message : 'Falha ao renovar token do Mercado Pago.',
    })
    return null
  }
}

export function buildMercadoPagoPaymentBody(input: {
  externalReference: string
  checkoutData: CheckoutBrickPayload
  booking: CheckoutBookingContext
}): PaymentCreateRequest {
  const { externalReference, checkoutData, booking } = input
  const paymentMethodId = checkoutData.formData.payment_method_id ?? booking.paymentMethod
  const payerEmail = checkoutData.formData.payer?.email ?? booking.studentEmail

  const body: PaymentCreateRequest = {
    transaction_amount: normalizeMercadoPagoAmount(booking.amount),
    description: booking.selectionType === 'package'
      ? `${booking.schoolName} - ${booking.packageName ?? 'Pacote de aulas'}`
      : `${booking.schoolName} - Aula avulsa`,
    external_reference: externalReference,
    notification_url: buildWebhookNotificationUrl(booking.schoolId),
    payment_method_id: paymentMethodId,
    metadata: {
      school_id: booking.schoolId,
      school_slug: booking.schoolSlug,
      student_id: booking.studentId,
      instructor_id: booking.instructorId,
      selection_type: booking.selectionType,
      booking_ids: booking.bookingIds,
      student_package_id: booking.studentPackageId ?? null,
      package_id: booking.packageId ?? null,
    },
    payer: {
      email: payerEmail,
      first_name: checkoutData.formData.payer?.firstName,
      last_name: checkoutData.formData.payer?.lastName,
      identification: checkoutData.formData.payer?.identification,
    },
    additional_info: {
      items: checkoutData.formData.additional_info?.items?.map((item) => ({
        id: booking.packageId ?? booking.bookingIds[0],
        title: item.title,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })) ?? [
        {
          id: booking.packageId ?? booking.bookingIds[0],
          title: booking.selectionType === 'package' ? booking.packageName ?? 'Pacote de aulas' : 'Aula avulsa',
          description: `${booking.instructorName} · ${booking.studentName}`,
          quantity: 1,
          unit_price: normalizeMercadoPagoAmount(booking.amount),
        },
      ],
      payer: {
        first_name: checkoutData.formData.payer?.firstName,
        last_name: checkoutData.formData.payer?.lastName,
      },
    },
  }

  if (checkoutData.formData.token) {
    body.token = checkoutData.formData.token
  }

  if (checkoutData.formData.installments) {
    body.installments = checkoutData.formData.installments
  }

  if (checkoutData.formData.issuer_id) {
    body.issuer_id = Number(checkoutData.formData.issuer_id)
  }

  if (checkoutData.formData.payment_method_option_id) {
    body.payment_method = {
      type: checkoutData.additionalData?.paymentTypeId,
    }
  }

  if (checkoutData.formData.transaction_details?.financial_institution) {
    body.transaction_details = {
      financial_institution: checkoutData.formData.transaction_details.financial_institution,
    }
  }

  return body
}

export function mapMercadoPagoStatus(status?: string): LocalPaymentStatus {
  switch (status) {
    case 'approved':
      return 'paid'
    case 'authorized':
    case 'in_process':
    case 'pending':
      return 'pending'
    default:
      return 'failed'
  }
}

export function mapMercadoPagoStatusMessage(payment: PaymentResponse) {
  switch (payment.status) {
    case 'approved':
      return 'Pagamento aprovado.'
    case 'pending':
    case 'in_process':
      return 'Pagamento pendente. Aguarde a confirmação.'
    case 'authorized':
      return 'Pagamento autorizado e aguardando captura.'
    default:
      return payment.status_detail || 'Pagamento não aprovado.'
  }
}

export function parseMercadoPagoSignature(signatureHeader: string | null) {
  if (!signatureHeader) return null

  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, item) => {
    const [key, value] = item.split('=')
    if (key && value) acc[key.trim()] = value.trim()
    return acc
  }, {})

  if (!parts.ts || !parts.v1) return null
  return { ts: parts.ts, v1: parts.v1 }
}

export function buildWebhookManifest(input: {
  dataId: string
  requestId: string
  ts: string
}) {
  return `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${input.ts};`
}

export function validateMercadoPagoWebhookSignature(input: {
  dataId: string
  requestId: string | null
  signatureHeader: string | null
  secret: string
}) {
  const parsed = parseMercadoPagoSignature(input.signatureHeader)
  if (!parsed || !input.requestId) return false

  const manifest = buildWebhookManifest({
    dataId: input.dataId,
    requestId: input.requestId,
    ts: parsed.ts,
  })

  const digest = crypto.createHmac('sha256', input.secret).update(manifest).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(parsed.v1))
}
