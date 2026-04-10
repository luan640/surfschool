import { notFound } from 'next/navigation'
import { getPublicTripBySlugs } from '@/actions/trips'
import { TripPageContent } from './TripPageContent'

interface Props {
  params: Promise<{ school: string; trip: string }>
}

export default async function PublicTripPage({ params }: Props) {
  const { school, trip } = await params
  const data = await getPublicTripBySlugs(school, trip)

  if (!data) notFound()

  return <TripPageContent data={data} />
}
