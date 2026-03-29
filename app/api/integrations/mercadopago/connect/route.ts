import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildMercadoPagoAuthorizationUrl, getPublicAppBaseUrl } from '@/lib/payments/mercadopago'

export async function GET(request: Request) {
  const origin = getPublicAppBaseUrl()
  const settingsUrl = '/dashboard/settings/payment-methods'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) {
    return NextResponse.redirect(new URL('/auth/login', origin))
  }

  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!school) {
    return NextResponse.redirect(new URL(`${settingsUrl}?mp=error`, origin))
  }

  const { url } = buildMercadoPagoAuthorizationUrl({
    schoolId: school.id,
    ownerId: user.id,
  })

  return NextResponse.redirect(url)
}
