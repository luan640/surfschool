import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMySchool } from '@/actions/instructors'
import { DashboardNav } from '@/components/dashboard/DashboardNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const school = await getMySchool()
  if (!school) redirect('/auth/register?pending_school=1')

  const ownerName = user.user_metadata?.name ?? user.email ?? 'Proprietário'

  return (
    <div className="flex min-h-screen" style={{ '--primary': school.primary_color, '--cta': school.cta_color } as React.CSSProperties}>
      <DashboardNav schoolName={school.name} schoolLogoUrl={school.logo_url} ownerName={ownerName} />
      <main className="flex-1 bg-slate-50 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
