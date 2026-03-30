import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMySchool } from '@/actions/instructors'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const school = await getMySchool()
  if (!school) redirect('/auth/register?pending_school=1')

  const ownerName = user.user_metadata?.name ?? user.email ?? 'Proprietario'

  return (
    <DashboardShell
      schoolName={school.name}
      schoolLogoUrl={school.logo_url}
      ownerName={ownerName}
      primaryColor={school.primary_color}
      ctaColor={school.cta_color}
    >
      {children}
    </DashboardShell>
  )
}
