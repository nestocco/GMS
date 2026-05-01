// supabase/functions/nueva-membresia/index.ts
// Crea una nueva membresía sobre un usuario existente y registra el primer pago.
// Usado para: alta de membresía (sin cuenta nueva), renovación y renovación anticipada.
//
// Payload:
//   user_id, plan_id, branch_id, start_date (ISO),
//   plan_duration_days, base_price, final_price,
//   metodo_pago, payment_type ('PAGO_COMPLETO' | 'CUOTA_1')
//
// Solo accesible para R1_DUENO, R2_ENCARGADO, R3_STAFF.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── Validar sesión ────────────────────────────────────────────────────────
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

    const ALLOWED = ['R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF']
    if (!ALLOWED.includes(callerUser?.role ?? '')) return err(403, 'Sin permiso')

    // ── Payload ───────────────────────────────────────────────────────────────
    const {
      user_id, plan_id, branch_id,
      start_date,
      plan_duration_days,
      base_price, final_price,
      metodo_pago, payment_type,
    } = await req.json()

    if (!user_id || !plan_id || !branch_id || !metodo_pago || !payment_type) {
      return err(400, 'Faltan campos obligatorios')
    }

    // ── Calcular fechas ───────────────────────────────────────────────────────
    const startDate = start_date ? new Date(start_date) : new Date()
    const endDate   = new Date(startDate)
    endDate.setDate(endDate.getDate() + (plan_duration_days ?? 30))

    // ── Insertar membresía ────────────────────────────────────────────────────
    const { data: membership, error: memErr } = await admin
      .from('memberships')
      .insert({
        user_id,
        plan_id,
        branch_id,
        status:      'ACTIVA',
        start_date:  startDate.toISOString(),
        end_date:    endDate.toISOString(),
        base_price,
        final_price,
      })
      .select('id')
      .single()

    if (memErr) return err(500, `Error en memberships: ${memErr.message}`)

    // ── Insertar pago ─────────────────────────────────────────────────────────
    const amount = payment_type === 'CUOTA_1'
      ? Math.round(final_price / 2)
      : final_price

    const { error: payErr } = await admin.from('payments').insert({
      user_id,
      membership_id:  membership.id,
      branch_id,
      registered_by:  caller.id,
      amount,
      method:         metodo_pago,
      payment_type,
    })
    if (payErr) return err(500, `Error en payments: ${payErr.message}`)

    // ── Activar usuario si pago completo ──────────────────────────────────────
    if (payment_type !== 'CUOTA_1') {
      await admin.from('users').update({ is_active: true }).eq('id', user_id)
    }

    return new Response(
      JSON.stringify({ ok: true, membership_id: membership.id }),
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
