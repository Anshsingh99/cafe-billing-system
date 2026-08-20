import { createClient } from '@supabase/supabase-js'

let adminClient: ReturnType<typeof createClient> | undefined

export function createAdminClient() {
  if (!adminClient) {
    const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) throw new Error('Supabase server key is not configured')
    adminClient = createClient(process.env.SUPABASE_URL!, key, { auth: { autoRefreshToken: false, persistSession: false } })
  }
  return adminClient
}
