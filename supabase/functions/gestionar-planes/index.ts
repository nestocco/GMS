// supabase/functions/gestionar-planes/index.ts
// Acciones:
//   'crear'        → alta de un plan nuevo + log versión 1
//   'editar'       → actualización de campos + log
//   'toggleActivo' → activar / desactivar plan + log
// Solo R1_DUENO puede ejecutar cualquiera de estas acciones.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_ROLES = ['R1_DUENO']

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

    if (!ALLOWED_ROLES.includes(callerUser?.role)) return err(403, 'Sin permiso')

    const body = await req.json()
    const { action } = body

    // ── Crear plan ───────────────────────────────────────────────────────────
    if (action === 'crear') {
      const { nombre, nivel, duracion, precio, freezeDias } = body

      if (!nombre?.trim()) return err(400, 'El nombre es obligatorio')
      if (!nivel)          return err(400, 'El nivel es obligatorio')
      if (!duracion || duracion <= 0) return err(400, 'La duración debe ser mayor a 0')
      if (!precio  || precio  <= 0)  return err(400, 'El precio debe ser mayor a 0')

      const { data: plan, error: insertErr } = await admin
        .from('plans')
        .insert({
          name:              nombre.trim(),
          level:             nivel,
          duration_days:     duracion,
          base_price:        precio,
          freeze_days_quota: freezeDias ?? 0,
          is_active:         true,
        })
        .select()
        .single()

      if (insertErr) return err(500, insertErr.message)

      await admin.from('plan_audit_log').insert({
        plan_id:    plan.id,
        version:    1,
        action:     'CREAR',
        snapshot:   plan,
        changed_by: caller.id,
      })

      return ok({ plan })
    }

    // ── Editar plan ──────────────────────────────────────────────────────────
    if (action === 'editar') {
      const { plan_id, nombre, nivel, duracion, precio, freezeDias } = body

      if (!plan_id)               return err(400, 'plan_id requerido')
      if (!nombre?.trim())        return err(400, 'El nombre es obligatorio')
      if (!nivel)                 return err(400, 'El nivel es obligatorio')
      if (!duracion || duracion <= 0) return err(400, 'La duración debe ser mayor a 0')
      if (!precio   || precio   <= 0) return err(400, 'El precio debe ser mayor a 0')

      const { data: plan, error: updateErr } = await admin
        .from('plans')
        .update({
          name:              nombre.trim(),
          level:             nivel,
          duration_days:     duracion,
          base_price:        precio,
          freeze_days_quota: freezeDias ?? 0,
        })
        .eq('id', plan_id)
        .select()
        .single()

      if (updateErr) return err(500, updateErr.message)

      const { count } = await admin
        .from('plan_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', plan_id)

      await admin.from('plan_audit_log').insert({
        plan_id:    plan_id,
        version:    (count ?? 0) + 1,
        action:     'EDITAR',
        snapshot:   plan,
        changed_by: caller.id,
      })

      return ok({ plan })
    }

    // ── Toggle activo ────────────────────────────────────────────────────────
    if (action === 'toggleActivo') {
      const { plan_id, activo } = body

      if (!plan_id)          return err(400, 'plan_id requerido')
      if (activo === undefined) return err(400, 'activo requerido')

      const { data: plan, error: updateErr } = await admin
        .from('plans')
        .update({ is_active: activo })
        .eq('id', plan_id)
        .select()
        .single()

      if (updateErr) return err(500, updateErr.message)

      const { count } = await admin
        .from('plan_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', plan_id)

      await admin.from('plan_audit_log').insert({
        plan_id:    plan_id,
        version:    (count ?? 0) + 1,
        action:     activo ? 'ACTIVAR' : 'DESACTIVAR',
        snapshot:   plan,
        changed_by: caller.id,
      })

      return ok({ plan })
    }

    return err(400, `Acción desconocida: ${action}`)

  } catch (e) {
    return err(500, String(e))
  }
})
