import { redirect } from 'next/navigation'
import { getSchoolSettings, updateSchoolSettings } from '@/actions/dashboard'
import { AccountDataForm } from '@/components/dashboard/settings/AccountDataForm'

interface Props {
  searchParams?: Promise<{ status?: string }>
}

export default async function AccountDataPage({ searchParams }: Props) {
  const school = await getSchoolSettings()
  if (!school) redirect('/auth/login')
  const params = searchParams ? await searchParams : undefined

  async function save(formData: FormData) {
    'use server'
    const result = await updateSchoolSettings(formData)
    redirect(`/dashboard/settings/account-data?status=${result.success ? 'saved' : 'error'}`)
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://vamosurfar.app').replace(/\/$/, '')
  const bookingUrl = `${appUrl}/${school.slug}`

  return <AccountDataForm school={school} status={params?.status} action={save} bookingUrl={bookingUrl} />
}
