// supabase/functions/gestionar-claims/index.ts
// Lee y gestiona claims individuales de usuarios de staff.
//
// Acciones:
//   get    → devuelve role_claims + user_claims del target (lectura privilegiada)
//   toggle → activa o desactiva un claim individual + registra en auditoría
//
// Permisos de modificación/lectura:
//   R1_DUENO     → puede gestionar R2_ENCARGADO y R3_STAFF
//   R2_ENCARGADO → puede gestionar solo R3_STAFF

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CAN_MANAGE: Record<string, string[]> = {
  R1_DUENO:     ['R2_ENCARGADO', 'R3_STAFF'],
  R2_ENCARGADO: ['R3_STAFF'],
}

const VALID_CLAIMS = [
  'can_export_db',
  'can_manage_roles',
  'can_view_financials',
  'can_register_payment',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
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

    const callerRole = callerUser?.role ?? ''
    if (!CAN_MANAGE[callerRole]) return err(403, 'Sin permiso para gestionar claims')

    const body = await req.json()
    const action = body.action ?? 'toggle'
    const { target_user_id } = body

    if (!target_user_id) return err(400, 'Falta campo: target_user_id')

    const { data: targetUser } = await admin
      .from('users')
      .select('role')
      .eq('id', target_user_id)
      .single()

    if (!targetUser) return err(404, 'Usuario no encontrado')
    if (!CAN_MANAGE[callerRole].includes(targetUser.role)) {
      return err(403, `Sin permiso para gestionar claims de ${targetUser.role}`)
    }

    // ── Acción: get ─────────────────────────────────────────────────────────
    if (action === 'get') {
      const [{ data: roleClaims }, { data: userClaims }] = await Promise.all([
        admin.from('role_claims').select('claim, value').eq('role', targetUser.role),
        admin.from('user_claims').select('claim, value').eq('user_id', target_user_id),
      ])

      return new Response(
        JSON.stringify({ ok: true, role_claims: roleClaims ?? [], user_claims: userClaims ?? [] }),
        { headers: { ...CORS, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ── Acción: toggle ───────────────────────────────────────────────────────
    const { claim, new_value } = body

    if (!claim)                         return err(400, 'Falta campo: claim')
    if (!VALID_CLAIMS.includes(claim))  return err(400, `Claim no válido: ${claim}`)
    if (typeof new_value !== 'boolean') return err(400, 'new_value debe ser boolean')

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      null

    // Leer default del rol para este claim
    const { data: roleDefaultRow } = await admin
      .from('role_claims')
      .select('value')
      .eq('role', targetUser.role)
      .eq('claim', claim)
      .maybeSingle()

    const roleDefaultValue = roleDefaultRow?.value ?? false

    // Leer override actual (si existe)
    const { data: currentOverride } = await admin
      .from('user_claims')
      .select('value')
      .eq('user_id', target_user_id)
      .eq('claim', claim)
      .maybeSingle()

    const oldValue = currentOverride != null ? currentOverride.value : roleDefaultValue

    let auditAction: string
    if (new_value === roleDefaultValue) {
      // El nuevo valor coincide con el default del rol → eliminar override
      await admin
        .from('user_claims')
        .delete()
        .eq('user_id', target_user_id)
        .eq('claim', claim)
      auditAction = 'claim_reset'
    } else {
      // Difiere del default → upsert override
      await admin
        .from('user_claims')
        .upsert(
          { user_id: target_user_id, claim, value: new_value },
          { onConflict: 'user_id,claim' }
        )
      auditAction = new_value ? 'claim_enable' : 'claim_disable'
    }

    // Registrar en auditoría (no bloqueante — el cambio ya se aplicó)
    await admin.from('permission_audit_log').insert({
      performed_by:   caller.id,
      target_user_id,
      action:         auditAction,
      entity:         claim,
      old_value:      String(oldValue),
      new_value:      String(new_value),
      ip_address:     ip,
    })

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (e) {
    return err(500, (e as Error).message)
  }
})

function err(status: number, message: string) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
    status,
  })
}
