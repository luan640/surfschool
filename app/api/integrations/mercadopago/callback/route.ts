import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  exchangeMercadoPagoAuthorizationCode,
  upsertMercadoPagoConnection,
  verifyMercadoPagoOAuthState,
} from '@/lib/payments/mercadopago'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const origin = url.origin

  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard/settings?mp=error', origin))
  }

  const payload = verifyMercadoPagoOAuthState(state)
  if (!payload) {
    return NextResponse.redirect(new URL('/dashboard/settings?mp=error', origin))
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id || user.id !== payload.ownerId) {
    return NextResponse.redirect(new URL('/auth/login', origin))
  }

  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('id', payload.schoolId)
    .eq('owner_id', user.id)
    .single()

  if (!school) {
    return NextResponse.redirect(new URL('/dashboard/settings?mp=error', origin))
  }

  try {
    const token = await exchangeMercadoPagoAuthorizationCode({ code })
    await upsertMercadoPagoConnection({
      schoolId: school.id,
      token,
    })

    return NextResponse.redirect(new URL('/dashboard/settings?mp=connected', origin))
  } catch (err) {
    console.error('[MP OAuth callback error]', err instanceof Error ? err.message : err)
    return NextResponse.redirect(new URL('/dashboard/settings?mp=error', origin))
  }
}
