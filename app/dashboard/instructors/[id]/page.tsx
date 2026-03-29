import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMySchool } from '@/actions/instructors'
import { InstructorForm } from '@/components/dashboard/InstructorForm'
import type { Instructor } from '@/lib/types'

export default async function EditInstructorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const school = await getMySchool()
  if (!school) notFound()

  const { data } = await supabase
    .from('instructors')
    .select('*, availability:instructor_availability(*)')
    .eq('id', id)
    .eq('school_id', school.id)
    .single()

  if (!data) notFound()

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-condensed text-3xl font-bold uppercase text-slate-800 tracking-wide">
          Editar Instrutor
        </h1>
        <p className="text-slate-400 text-sm mt-1">{data.full_name}</p>
      </div>
      <InstructorForm instructor={data as Instructor} />
    </div>
  )
}
