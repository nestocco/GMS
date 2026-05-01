// supabase/functions/crear-personal/index.ts
// Crea un integrante de personal (R2_ENCARGADO, R3_STAFF o R4_ENTRENADOR).
//
// Permisos:
//   R1_DUENO    → puede crear R2, R3, R4
//   R2_ENCARGADO → puede crear solo R3

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_TARGETS: Record<string, string[]> = {
  R1_DUENO:     ['R2_ENCARGADO', 'R3_STAFF', 'R4_ENTRENADOR'],
  R2_ENCARGADO: ['R3_STAFF'],
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── Validar sesión ────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return err(401, 'Sin autorización')

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      null

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

    const callerRole = callerUser?.role ?? ''
    if (!ALLOWED_TARGETS[callerRole]) return err(403, 'Sin permiso para crear personal')

    // ── Payload ───────────────────────────────────────────────────────────────
    const body = await req.json()
    const {
      email, password,
      first_name, last_name,
      phone, dni, birth_date,
      role: targetRole,
      branch_id,
    } = body

    if (!email || !password || !first_name || !last_name || !targetRole || !branch_id) {
      return err(400, 'Faltan campos obligatorios: email, password, first_name, last_name, role, branch_id')
    }

    if (!ALLOWED_TARGETS[callerRole].includes(targetRole)) {
      return err(403, `No tenés permiso para crear usuarios con rol ${targetRole}`)
    }

    // ── 1. Crear cuenta en auth.users ─────────────────────────────────────────
    const { data: authData, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: targetRole },
    })
    if (createErr) {
      const isDupe = createErr.message.toLowerCase().includes('already')
      return err(isDupe ? 409 : 400, isDupe
        ? `El email ${email} ya está registrado`
        : `Error creando cuenta: ${createErr.message}`
      )
    }
    const userId = authData.user.id

    // ── 2. public.users ───────────────────────────────────────────────────────
    const { error: usersErr } = await admin.from('users').upsert({
      id:               userId,
      email,
      phone:            phone ?? null,
      role:             targetRole,
      is_active:        true,
      origin_branch_id: branch_id,
    }, { onConflict: 'id', ignoreDuplicates: true })
    if (usersErr) return err(500, `Error en users: ${usersErr.message}`)

    // ── 3. socio_profiles (almacena nombre; useStaff lo consulta aquí) ────────
    const { error: profileErr } = await admin.from('socio_profiles').insert({
      user_id:    userId,
      first_name,
      last_name,
      phone:      phone ?? null,
      dni:        dni ?? null,
      birth_date: birth_date ?? null,
    })
    if (profileErr) return err(500, `Error en socio_profiles: ${profileErr.message}`)

    // ── 4. staff_assignments ──────────────────────────────────────────────────
    const { error: assignErr } = await admin.from('staff_assignments').insert({
      user_id:     userId,
      branch_id,
      role:        targetRole,
      assigned_by: caller.id,
      is_active:   true,
    })
    if (assignErr) return err(500, `Error en staff_assignments: ${assignErr.message}`)

    // ── 5. Auditoría ──────────────────────────────────────────────────────────
    await admin.from('permission_audit_log').insert({
      performed_by:   caller.id,
      target_user_id: userId,
      action:         'staff_create',
      entity:         targetRole,
      old_value:      null,
      new_value:      targetRole,
      ip_address:     ip,
    })

    return new Response(
      JSON.stringify({ ok: true, user_id: userId }),
      { headers: { ...CORS, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (e) {
    return err(500, (e as Error).message)
  }
})

function err(status: number, message: string) {
  return new Response(
    JSON.stringify({ ok: false, error: message }),
    { headers: { ...CORS, 'Content-Type': 'application/json' }, status }
  )
}
