import type { User } from '@supabase/auth-js'
import { createAdminClient } from '@/lib/supabase/admin'

export async function findAuthUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return null

  const admin = createAdminClient()
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error(error.message)
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === normalizedEmail) ?? null
    if (user) return user as User
    if (data.users.length < perPage) return null
    page += 1
  }
}
