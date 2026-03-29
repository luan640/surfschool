import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OwnerRegisterForm } from './register-form'

export default async function OwnerRegisterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: school } = await supabase
      .from('schools')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (school) {
      redirect('/dashboard/overview')
    }
  }

  return <OwnerRegisterForm mode={user ? 'complete' : 'signup'} />
}
