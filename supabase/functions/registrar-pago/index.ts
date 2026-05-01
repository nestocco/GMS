// supabase/functions/registrar-pago/index.ts
// Registra el pago de una cuota sobre una membresía existente.
//
// Escenarios que maneja:
//   - CUOTA_2: CUOTA_1 ya pagada, se registra la segunda cuota y la membresía pasa a ACTIVA
//   - PAGO_MORA: pago de deuda en membresía IMPAGO → vuelve a ACTIVA
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
    const { membership_id, method, notes } = await req.json()
    if (!membership_id || !method) return err(400, 'Faltan campos obligatorios')

    // ── Leer membresía ────────────────────────────────────────────────────────
    const { data: membership, error: memErr } = await admin
      .from('memberships')
      .select('id, user_id, branch_id, status, final_price, payments(id, payment_type)')
      .eq('id', membership_id)
      .single()

    if (memErr || !membership) return err(404, 'Membresía no encontrada')

    const { user_id, branch_id, status, final_price, payments } = membership
    const existingTypes: string[] = (payments ?? []).map((p: any) => p.payment_type)

    // ── Determinar tipo y monto del pago ──────────────────────────────────────
    let payment_type: string
    let amount: number

    const hasCuota1 = existingTypes.includes('CUOTA_1')
    const hasCuota2 = existingTypes.includes('CUOTA_2')
    const hasMora   = existingTypes.includes('PAGO_MORA')

    if (hasCuota1 && !hasCuota2) {
      // Caso: CUOTA_2 pendiente
      payment_type = 'CUOTA_2'
      amount = Math.round(final_price / 2)
    } else if (status === 'IMPAGO' && !hasMora) {
      // Caso: mora — pago total adeudado
      payment_type = 'PAGO_MORA'
      amount = final_price
    } else if (status === 'IMPAGO' && hasMora) {
      // Mora ya registrada pero el estado no se actualizó — corregir y avisar
      await admin.from('memberships').update({ status: 'ACTIVA' }).eq('id', membership_id)
      await admin.from('users').update({ is_active: true }).eq('id', user_id)
      return err(409, 'El pago ya fue registrado previamente.')
    } else {
      return err(409, 'Esta membresía no tiene pagos pendientes registrables')
    }

    // ── Insertar pago ─────────────────────────────────────────────────────────
    const { error: payErr } = await admin.from('payments').insert({
      user_id,
      membership_id,
      branch_id,
      registered_by: caller.id,
      amount,
      method,
      payment_type,
      notes: notes ?? null,
    })
    if (payErr) return err(500, `Error registrando pago: ${payErr.message}`)

    // ── Actualizar estado de membresía → ACTIVA ───────────────────────────────
    const { error: updateErr } = await admin
      .from('memberships')
      .update({ status: 'ACTIVA' })
      .eq('id', membership_id)
    if (updateErr) return err(500, `Error actualizando membresía: ${updateErr.message}`)

    // ── Activar usuario si estaba inactivo ────────────────────────────────────
    await admin
      .from('users')
      .update({ is_active: true })
      .eq('id', user_id)

    return new Response(
      JSON.stringify({ ok: true, payment_type, amount }),
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
