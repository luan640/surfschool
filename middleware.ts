import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard']
const EXCLUDED_PREFIXES  = ['/auth', '/api', '/_next', '/favicon', '/static']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next({ request })
  type ResponseCookieOptions = Parameters<typeof response.cookies.set>[2]
  type CookieToSet = { name: string; value: string; options?: ResponseCookieOptions }

  // Skip Supabase static/API paths
  if (EXCLUDED_PREFIXES.some(p => pathname.startsWith(p))) return response

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

  const { data: { user } } = await supabase.auth.getUser()

  // ── Protect /dashboard ─────────────────────────────────────────
  if (PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    return response
  }

  // ── Resolve school slug from first path segment ────────────────
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length > 0) {
    const slug = segments[0]
    const { data: school } = await supabase
      .from('schools')
      .select('id, slug, name, primary_color, cta_color')
      .eq('slug', slug)
      .eq('active', true)
      .single()

    if (school) {
      response.headers.set('x-school-id',   school.id)
      response.headers.set('x-school-slug', school.slug)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
