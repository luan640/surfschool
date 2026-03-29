import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  buildMercadoPagoOAuthAuthorizationCodeBody,
  buildWebhookManifest,
  mapMercadoPagoStatus,
  parseMercadoPagoSignature,
  signMercadoPagoOAuthState,
  validateMercadoPagoWebhookSignature,
  verifyMercadoPagoOAuthState,
} from '@/lib/payments/mercadopago'

process.env.MERCADOPAGO_CLIENT_ID = 'client-id'
process.env.MERCADOPAGO_CLIENT_SECRET = 'client-secret'
process.env.MERCADOPAGO_OAUTH_REDIRECT_URI = 'http://localhost:3000/api/integrations/mercadopago/callback'

describe('Mercado Pago webhook signature', () => {
  it('validates a signed webhook manifest', () => {
    const secret = 'super-secret'
    const manifest = buildWebhookManifest({
      dataId: 'ord01jq4s4ky8hwq6na5pxb65b3d3',
      requestId: '2066ca19-c6f1-498a-be75-1923005edd06',
      ts: '1742505638683',
    })
    const digest = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
    const signatureHeader = `ts=1742505638683,v1=${digest}`

    expect(validateMercadoPagoWebhookSignature({
      dataId: 'ord01jq4s4ky8hwq6na5pxb65b3d3',
      requestId: '2066ca19-c6f1-498a-be75-1923005edd06',
      signatureHeader,
      secret,
    })).toBe(true)
  })

  it('rejects malformed headers', () => {
    expect(parseMercadoPagoSignature('ts=1')).toBeNull()
    expect(validateMercadoPagoWebhookSignature({
      dataId: 'abc',
      requestId: 'req',
      signatureHeader: 'ts=1',
      secret: 'secret',
    })).toBe(false)
  })
})

describe('Mercado Pago status mapping', () => {
  it('maps approved and pending states', () => {
    expect(mapMercadoPagoStatus('approved')).toBe('paid')
    expect(mapMercadoPagoStatus('pending')).toBe('pending')
    expect(mapMercadoPagoStatus('in_process')).toBe('pending')
  })

  it('maps rejected states to failed', () => {
    expect(mapMercadoPagoStatus('rejected')).toBe('failed')
    expect(mapMercadoPagoStatus('cancelled')).toBe('failed')
  })
})

describe('Mercado Pago OAuth state', () => {
  it('signs and validates the OAuth state payload', () => {
    const state = signMercadoPagoOAuthState({
      schoolId: 'school-1',
      ownerId: 'owner-1',
      ts: Date.now(),
      nonce: 'nonce-1',
    })

    const payload = verifyMercadoPagoOAuthState(state)
    expect(payload?.schoolId).toBe('school-1')
    expect(payload?.ownerId).toBe('owner-1')
  })

  it('rejects tampered OAuth state', () => {
    const state = signMercadoPagoOAuthState({
      schoolId: 'school-1',
      ownerId: 'owner-1',
      ts: Date.now(),
      nonce: 'nonce-1',
    })

    const [payload, signature] = state.split('.')
    expect(verifyMercadoPagoOAuthState(`${payload}.tampered${signature}`)).toBeNull()
  })
})

describe('Mercado Pago OAuth token exchange payload', () => {
  it('does not include state in the authorization code exchange body', () => {
    const body = buildMercadoPagoOAuthAuthorizationCodeBody({
      code: 'code-123',
    })

    expect(body.get('client_id')).toBe('client-id')
    expect(body.get('client_secret')).toBe('client-secret')
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('code')).toBe('code-123')
    expect(body.get('redirect_uri')).toBe('http://localhost:3000/api/integrations/mercadopago/callback')
    expect(body.get('state')).toBeNull()
  })
})
