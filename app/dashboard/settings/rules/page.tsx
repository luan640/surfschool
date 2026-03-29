import { redirect } from 'next/navigation'
import { getSchoolRules, updateSchoolRules } from '@/actions/dashboard'
import { RulesForm } from '@/components/dashboard/settings/RulesForm'

interface Props {
  searchParams?: Promise<{ status?: string }>
}

export default async function RulesPage({ searchParams }: Props) {
  const rules = await getSchoolRules()
  if (!rules) redirect('/auth/login')

  const params = searchParams ? await searchParams : undefined

  async function save(formData: FormData) {
    'use server'

    const result = await updateSchoolRules(formData)
    if (!result.success) {
      redirect('/dashboard/settings/rules?status=error')
    }

    redirect('/dashboard/settings/rules?status=saved')
  }

  return <RulesForm rules={rules} status={params?.status} action={save} />
}
