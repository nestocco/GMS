// supabase/functions/editar-socio/index.ts
// Maneja dos acciones:
//   action: 'get'    → devuelve el perfil completo del socio (con nombre del representante)
//                      R4_ENTRENADOR solo recibe campos de salud (no contacto/representante)
//                      y solo puede acceder a socios de sus sucursales asignadas.
//   action: 'update' → actualiza socio_profiles (R1/R2/R3 únicamente)
// Usa service_role para bypassear RLS en ambos casos.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GET_ROLES         = ['R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF', 'R4_ENTRENADOR']
const UPDATE_ROLES      = ['R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF']
const HEALTH_EDIT_ROLES = ['R1_DUENO', 'R2_ENCARGADO']

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

    const body   = await req.json()
    const { action = 'update', socio_id } = body

    if (!socio_id) return err(400, 'socio_id requerido')

    const isR4 = callerUser?.role === 'R4_ENTRENADOR'

    if (!callerUser || !GET_ROLES.includes(callerUser.role)) {
      return err(403, 'Sin permiso para operar sobre socios')
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET — devuelve perfil del socio
    // ─────────────────────────────────────────────────────────────────────────
    if (action === 'get') {
      // R4: verificar que el socio pertenece a alguna de las sucursales del entrenador
      if (isR4) {
        const { data: assignments } = await admin
          .from('staff_assignments')
          .select('branch_id')
          .eq('user_id', caller.id)
          .eq('is_active', true)
        const trainerBranches = (assignments ?? []).map((a: any) => a.branch_id)

        const { data: membership } = await admin
          .from('memberships')
          .select('branch_id')
          .eq('user_id', socio_id)
          .in('status', ['ACTIVA', 'EN_GRACIA', 'IMPAGO', 'CONGELADA'])
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!membership || !trainerBranches.includes(membership.branch_id)) {
          return err(403, 'Socio no pertenece a tus sucursales asignadas')
        }
      }

      const { data: profile, error: profileErr } = await admin
        .from('socio_profiles')
        .select(`
          first_name, last_name, dni, birth_date, phone, origin_channel,
          emergency_name, emergency_phone, medical_notes,
          guardian_user_id, guardian_name, guardian_dni,
          guardian_phone, guardian_relationship,
          photo_url
        `)
        .eq('user_id', socio_id)
        .single()

      if (profileErr || !profile) return err(404, 'Perfil no encontrado')

      // R4: registrar acceso a datos de salud en audit log
      if (isR4) {
        await admin.from('permission_audit_log').insert({
          performed_by:   caller.id,
          target_user_id: socio_id,
          action:         'health_view',
          entity:         'socio_profiles',
        })

        // Solo devolver campos de salud — datos de contacto/representante son R1/R2/R3
        return ok({
          profile: {
            first_name:      profile.first_name,
            last_name:       profile.last_name,
            emergency_name:  profile.emergency_name,
            emergency_phone: profile.emergency_phone,
            medical_notes:   profile.medical_notes,
          },
        })
      }

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
    // UPDATE_PHOTO — actualiza solo photo_url (R1/R2/R3)
    // ─────────────────────────────────────────────────────────────────────────
    if (action === 'update_photo') {
      if (!UPDATE_ROLES.includes(callerUser.role)) {
        return err(403, 'Sin permiso para editar socios')
      }
      const { photo_url } = body
      const { error: updateErr } = await admin
        .from('socio_profiles')
        .update({ photo_url: photo_url ?? null })
        .eq('user_id', socio_id)
      if (updateErr) return err(500, updateErr.message)
      return ok()
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE — actualiza socio_profiles (R1/R2/R3 únicamente)
    // ─────────────────────────────────────────────────────────────────────────
    if (!UPDATE_ROLES.includes(callerUser.role)) {
      return err(403, 'Sin permiso para editar socios')
    }

    const {
      first_name, last_name,
      dni, birth_date, phone, origin_channel,
      emergency_name, emergency_phone, medical_notes,
      guardian_user_id, guardian_name, guardian_dni,
      guardian_phone, guardian_relationship,
    } = body

    if (!first_name) return err(400, 'first_name requerido')
    if (!last_name)  return err(400, 'last_name requerido')

    const canEditHealth = HEALTH_EDIT_ROLES.includes(callerUser.role)

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
