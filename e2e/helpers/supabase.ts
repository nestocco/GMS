// helpers/supabase.ts
// Cliente Supabase con service_role exclusivo para helpers de seed y cleanup en tests.
// Exporta `adminClient` y funciones utilitarias (deleteUserByEmail, getSocioByDni,
// deleteMembershipsByUserId). No debe usarse en Page Objects ni en specs directamente.

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

dotenv.config({ path: path.resolve(__dirname, '../.env.e2e') })

// Cliente admin con service_role — solo para helpers de seed/cleanup en tests.
// NUNCA exponer SUPABASE_SERVICE_ROLE_KEY en el frontend ni en storageState.
function createAdminClient() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase admin credentials missing. Check VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in e2e/.env.e2e')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export const adminClient = createAdminClient()

// ── Helpers de limpieza ───────────────────────────────────────────────────────

export async function deleteUserByEmail(email: string) {
  const { data, error } = await adminClient.auth.admin.listUsers()
  if (error) throw error
  const user = data.users.find(u => u.email === email)
  if (user) {
    await adminClient.auth.admin.deleteUser(user.id)
  }
}

export async function getSocioByDni(dni: string) {
  const { data, error } = await adminClient
    .from('socio_profiles')
    .select('*, users(email, full_name)')
    .eq('dni', dni)
    .single()
  if (error) throw error
  return data
}

export async function deleteMembershipsByUserId(userId: string) {
  const { error } = await adminClient
    .from('memberships')
    .delete()
    .eq('user_id', userId)
  if (error) throw error
}
