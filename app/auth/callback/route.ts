import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = normalizeNextPath(requestUrl.searchParams.get('next'))
  const email = extractEmailFromPath(next)
  const redirectUrl = new URL(next, requestUrl.origin)
  const response = NextResponse.redirect(redirectUrl)
  type ResponseCookieOptions = Parameters<typeof response.cookies.set>[2]
  type CookieToSet = { name: string; value: string; options?: ResponseCookieOptions }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: CookieToSet[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const authError = requestUrl.searchParams.get('error')
  const authErrorDescription = requestUrl.searchParams.get('error_description')

  if (authError || authErrorDescription) {
    return NextResponse.redirect(new URL(buildConfirmationStatusPath('expired', email), request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL(buildConfirmationStatusPath('expired', email), request.url))
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL(buildConfirmationStatusPath('expired', email), request.url))
  }

  return response
}

function normalizeNextPath(next: string | null) {
  if (!next || !next.startsWith('/')) return '/auth/confirmation-status?status=success'
  return next
}

function extractEmailFromPath(path: string) {
  try {
    const url = new URL(path, 'https://surfbook.local')
    return url.searchParams.get('email') ?? ''
  } catch {
    return ''
  }
}

function buildConfirmationStatusPath(status: 'success' | 'expired', email: string) {
  const params = new URLSearchParams({ status })
  if (email) params.set('email', email)
  return `/auth/confirmation-status?${params.toString()}`
}
