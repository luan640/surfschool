import { createAdminClient } from '@/lib/supabase/admin'

export async function ensurePublicBucket(bucketName: string) {
  const admin = createAdminClient()
  const { data: buckets, error: listError } = await admin.storage.listBuckets()

  if (listError) {
    throw new Error(`Não foi possível listar os buckets do storage: ${listError.message}`)
  }

  const exists = (buckets ?? []).some((bucket) => bucket.name === bucketName || bucket.id === bucketName)
  if (exists) return

  const { error: createError } = await admin.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: '5MB',
  })

  if (createError && !createError.message.toLowerCase().includes('already exists')) {
    throw new Error(`Não foi possível criar o bucket ${bucketName}: ${createError.message}`)
  }
}
