// supabase/functions/editar-socio/index.ts
// Maneja dos acciones:
//   action: 'get'    → devuelve el perfil completo del socio (con nombre del representante)
//   action: 'update' → actualiza socio_profiles
// Usa service_role para bypassear RLS en ambos casos.
// Roles permitidos: R1_DUENO, R2_ENCARGADO, R3_STAFF.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_ROLES = ['R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF']
const HEALTH_ROLES  = ['R1_DUENO', 'R2_ENCARGADO']

function err(status: number, message: string) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function ok(data?: object) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── Validar sesión ───────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return err(401, 'Sin autorización')

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller }, error: authErr } = await anonClient.auth.getUser()
    if (authErr || !caller) return err(401, 'Sesión inválida')

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: callerUser } = await admin
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (!callerUser || !ALLOWED_ROLES.includes(callerUser.role)) {
      return err(403, 'Sin permiso para operar sobre socios')
    }

    const body       = await req.json()
    const { action = 'update', socio_id } = body

    if (!socio_id) return err(400, 'socio_id requerido')

    // ─────────────────────────────────────────────────────────────────────────
    // GET — devuelve perfil completo con nombre del representante resuelto
    // ─────────────────────────────────────────────────────────────────────────
    if (action === 'get') {
      const { data: profile, error: profileErr } = await admin
        .from('socio_profiles')
        .select(`
          first_name, last_name, dni, birth_date, phone, origin_channel,
          emergency_name, emergency_phone, medical_notes,
          guardian_user_id, guardian_name, guardian_dni,
          guardian_phone, guardian_relationship
        `)
        .eq('user_id', socio_id)
        .single()

      if (profileErr || !profile) return err(404, 'Perfil no encontrado')

      // Resolver nombre del representante si es un socio del gym
      let guardian_user_name = ''
      if (profile.guardian_user_id) {
        const { data: gProfile } = await admin
          .from('socio_profiles')
          .select('first_name, last_name')
          .eq('user_id', profile.guardian_user_id)
          .single()
        if (gProfile) {
          guardian_user_name = `${gProfile.first_name} ${gProfile.last_name}`.trim()
        }
      }

      return ok({ profile: { ...profile, guardian_user_name } })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE — actualiza socio_profiles
    // ─────────────────────────────────────────────────────────────────────────
    const {
      first_name, last_name,
      dni, birth_date, phone, origin_channel,
      emergency_name, emergency_phone, medical_notes,
      guardian_user_id, guardian_name, guardian_dni,
      guardian_phone, guardian_relationship,
    } = body

    if (!first_name) return err(400, 'first_name requerido')
    if (!last_name)  return err(400, 'last_name requerido')

    const canEditHealth = HEALTH_ROLES.includes(callerUser.role)

    const patch: Record<string, unknown> = {
      first_name,
      last_name,
      dni:                   dni                   ?? null,
      birth_date:            birth_date            ?? null,
      phone:                 phone                 ?? null,
      origin_channel:        origin_channel        ?? null,
      guardian_user_id:      guardian_user_id      ?? null,
      guardian_name:         guardian_name         ?? null,
      guardian_dni:          guardian_dni          ?? null,
      guardian_phone:        guardian_phone        ?? null,
      guardian_relationship: guardian_relationship ?? null,
    }

    if (canEditHealth) {
      patch.emergency_name  = emergency_name  ?? null
      patch.emergency_phone = emergency_phone ?? null
      patch.medical_notes   = medical_notes   ?? null
    }

    const { error: updateErr } = await admin
      .from('socio_profiles')
      .update(patch)
      .eq('user_id', socio_id)

    if (updateErr) return err(500, updateErr.message)

    return ok()

  } catch (e: any) {
    return err(500, e.message ?? 'Error inesperado')
  }
})
