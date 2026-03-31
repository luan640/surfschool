import { Suspense } from 'react'
import { UpdatePasswordClient } from './UpdatePasswordClient'

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={null}>
      <UpdatePasswordClient />
    </Suspense>
  )
}
