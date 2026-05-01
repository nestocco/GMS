// supabase/functions/editar-personal/index.ts
// Gestiona mutaciones sobre un integrante de personal existente.
//
// Acciones (body.action):
//   "update"        → actualiza nombre, teléfono y/o sede
//   "toggle_active" → activa o desactiva la cuenta
//
// Permisos:
//   R1_DUENO     → puede editar R2, R3, R4
//   R2_ENCARGADO → puede editar solo R3

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
    if (!ALLOWED_TARGETS[callerRole]) return err(403, 'Sin permiso para editar personal')

    // ── Payload ───────────────────────────────────────────────────────────────
    const body = await req.json()
    const { action, staff_id } = body
    if (!action || !staff_id) return err(400, 'Faltan campos: action, staff_id')

    // Verificar rol del target
    const { data: targetUser } = await admin
      .from('users')
      .select('role, is_active')
      .eq('id', staff_id)
      .single()

    if (!targetUser) return err(404, 'Usuario no encontrado')
    if (!ALLOWED_TARGETS[callerRole].includes(targetUser.role)) {
      return err(403, `No tenés permiso para editar usuarios con rol ${targetUser.role}`)
    }

    // ── Acción: update ────────────────────────────────────────────────────────
    if (action === 'update') {
      const { first_name, last_name, phone, branch_id } = body

      if (first_name || last_name) {
        const profileUpdate: Record<string, string> = {}
        if (first_name) profileUpdate.first_name = first_name
        if (last_name)  profileUpdate.last_name  = last_name

        const { error: profileErr } = await admin
          .from('socio_profiles')
          .update(profileUpdate)
          .eq('user_id', staff_id)
        if (profileErr) return err(500, `Error actualizando perfil: ${profileErr.message}`)
      }

      if (phone !== undefined) {
        const { error: userErr } = await admin
          .from('users')
          .update({ phone: phone ?? null, updated_at: new Date().toISOString() })
          .eq('id', staff_id)
        if (userErr) return err(500, `Error actualizando teléfono: ${userErr.message}`)
      }

      // Reasignación de sede: desactivar asignaciones actuales y crear nueva
      if (branch_id) {
        // Capturar sede anterior para auditoría
        const { data: oldAssign } = await admin
          .from('staff_assignments')
          .select('branch_id, branches:branch_id(name)')
          .eq('user_id', staff_id)
          .eq('is_active', true)
          .maybeSingle()

        const oldBranchName = (oldAssign as any)?.branches?.name ?? null

        await admin
          .from('staff_assignments')
          .update({ is_active: false })
          .eq('user_id', staff_id)
          .eq('is_active', true)

        const { error: assignErr } = await admin.from('staff_assignments').insert({
          user_id:     staff_id,
          branch_id,
          role:        targetUser.role,
          assigned_by: caller.id,
          is_active:   true,
        })
        if (assignErr) return err(500, `Error reasignando sede: ${assignErr.message}`)

        // Nombre de la nueva sede
        const { data: newBranch } = await admin
          .from('branches')
          .select('name')
          .eq('id', branch_id)
          .maybeSingle()

        await admin.from('permission_audit_log').insert({
          performed_by:   caller.id,
          target_user_id: staff_id,
          action:         'branch_change',
          entity:         null,
          old_value:      oldBranchName,
          new_value:      (newBranch as any)?.name ?? branch_id,
          ip_address:     ip,
        })
      }

      return ok()
    }

    // ── Acción: toggle_active ─────────────────────────────────────────────────
    if (action === 'toggle_active') {
      const newActive = !targetUser.is_active

      const { error: userErr } = await admin
        .from('users')
        .update({ is_active: newActive, updated_at: new Date().toISOString() })
        .eq('id', staff_id)
      if (userErr) return err(500, `Error actualizando estado: ${userErr.message}`)

      // Sincronizar staff_assignments
      await admin
        .from('staff_assignments')
        .update({ is_active: newActive })
        .eq('user_id', staff_id)

      // Auditoría
      await admin.from('permission_audit_log').insert({
        performed_by:   caller.id,
        target_user_id: staff_id,
        action:         newActive ? 'staff_activate' : 'staff_deactivate',
        entity:         null,
        old_value:      String(!newActive),
        new_value:      String(newActive),
        ip_address:     ip,
      })

      return ok({ is_active: newActive })
    }

    return err(400, `Acción desconocida: ${action}`)

  } catch (e) {
    return err(500, (e as Error).message)
  }
})

function ok(extra: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({ ok: true, ...extra }),
    { headers: { ...CORS, 'Content-Type': 'application/json' }, status: 200 }
  )
}

function err(status: number, message: string) {
  return new Response(
    JSON.stringify({ ok: false, error: message }),
    { headers: { ...CORS, 'Content-Type': 'application/json' }, status }
  )
}
