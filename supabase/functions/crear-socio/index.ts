// supabase/functions/crear-socio/index.ts
// Edge Function — crea un socio completo en 4 pasos atómicos:
//   1. auth.users  (via admin client con service_role)
//   2. public.users
//   3. public.socio_profiles
//   4. public.memberships + public.payments
//
// Llamar con: supabase.functions.invoke('crear-socio', { body: payload })
// Solo accesible para sesiones con rol R1_DUENO, R2_ENCARGADO o R3_STAFF.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── Validar sesión del invocador ─────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return err(401, 'Sin autorización')

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user: caller }, error: authErr } = await anonClient.auth.getUser()
    if (authErr || !caller) return err(401, 'Sesión inválida')

    // Leer rol desde public.users (fuente de verdad, no depende del JWT hook)
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
    const ALLOWED = ['R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF']
    if (!ALLOWED.includes(callerRole)) return err(403, 'Sin permiso para crear socios')

    // ── Payload ──────────────────────────────────────────────────────────────
    const body = await req.json()
    const {
      // Fase 1 — Cuenta
      email, password,
      // Fase 2 — Perfil
      first_name, last_name, dni, birth_date, phone, origin_channel,
      // Fase 3 — Salud
      emergency_name, emergency_phone, medical_notes, terms_accepted_at,
      // Tutor/representante (menor de edad)
      guardian_user_id, guardian_name, guardian_dni, guardian_phone, guardian_relationship,
      // Fase 4 — Membresía
      branch_id, plan_id, plan_duration_days, base_price, final_price,
      metodo_pago, payment_type,
    } = body

    if (!email || !password || !first_name || !last_name || !branch_id || !plan_id) {
      return err(400, 'Faltan campos obligatorios')
    }

    // Validar DNI único antes de crear el auth user
    if (dni) {
      const { data: existing } = await admin
        .from('socio_profiles')
        .select('dni')
        .eq('dni', dni)
        .maybeSingle()
      if (existing) return err(409, `El DNI ${dni} ya está registrado`)
    }

    // 1. Crear usuario en auth.users
    const { data: authData, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: 'R5_SOCIO' },
    })
    if (createErr) return err(400, `Error creando cuenta: ${createErr.message}`)
    const userId = authData.user.id

    // 2. public.users (upsert — el trigger puede haberlo insertado ya)
    const { error: usersErr } = await admin.from('users').upsert({
      id:               userId,
      email,
      role:             'R5_SOCIO',
      is_active:        false,
      origin_branch_id: branch_id,
    }, { onConflict: 'id', ignoreDuplicates: true })
    if (usersErr) return err(500, `Error en users: ${usersErr.message}`)

    // 3. socio_profiles
    const { error: profileErr } = await admin.from('socio_profiles').insert({
      user_id:           userId,
      first_name,
      last_name,
      dni:               dni ?? null,
      birth_date:        birth_date ?? null,
      phone:             phone ?? null,
      origin_channel:    origin_channel ?? null,
      emergency_name:        emergency_name ?? null,
      emergency_phone:       emergency_phone ?? null,
      medical_notes:         medical_notes ?? null,
      terms_accepted_at:     terms_accepted_at ?? null,
      guardian_user_id:      guardian_user_id ?? null,
      guardian_name:         guardian_name ?? null,
      guardian_dni:          guardian_dni ?? null,
      guardian_phone:        guardian_phone ?? null,
      guardian_relationship: guardian_relationship ?? null,
    })
    if (profileErr) return err(500, `Error en socio_profiles: ${profileErr.message}`)

    // 4. membership
    const startDate = new Date()
    const endDate   = new Date(startDate)
    endDate.setDate(endDate.getDate() + (plan_duration_days ?? 30))

    const { data: membership, error: memErr } = await admin.from('memberships').insert({
      user_id:     userId,
      plan_id,
      branch_id,
      status:      'ACTIVA',   // siempre ACTIVA al alta; si hay cuota pendiente el proceso diario transiciona a IMPAGO
      start_date:  startDate.toISOString(),
      end_date:    endDate.toISOString(),
      base_price:  base_price,
      final_price,
    }).select('id').single()
    if (memErr) return err(500, `Error en memberships: ${memErr.message}`)

    // 5. payment
    const { error: payErr } = await admin.from('payments').insert({
      user_id:        userId,
      membership_id:  membership.id,
      branch_id,
      registered_by:  caller.id,
      amount:         payment_type === 'CUOTA_1' ? Math.round(final_price / 2) : final_price,
      method:         metodo_pago,
      payment_type:   payment_type ?? 'PAGO_COMPLETO',
    })
    if (payErr) return err(500, `Error en payments: ${payErr.message}`)

    // Activar usuario si pago completo
    if (payment_type !== 'CUOTA_1') {
      await admin.from('users').update({ is_active: true }).eq('id', userId)
    }

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
