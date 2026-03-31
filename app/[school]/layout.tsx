import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function SchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ school: string }>
}) {
  const { school: slug } = await params
  const supabase = await createClient()

  const { data: school } = await supabase
    .from('schools')
    .select('id, name, tagline, primary_color, cta_color, logo_url, whatsapp')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!school) notFound()

  return (
    <div
      style={{
        '--primary':       school.primary_color,
        '--primary-dark':  shadeColor(school.primary_color, -15),
        '--primary-light': shadeColor(school.primary_color, 30),
        '--cta':           school.cta_color,
        '--cta-hover':     shadeColor(school.cta_color, -10),
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

function shadeColor(hex: string, pct: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(2.55 * pct)))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(2.55 * pct)))
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(2.55 * pct)))
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}
