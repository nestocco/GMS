// supabase/functions/gestionar-sucursales/index.ts
// Acciones: create | update | toggle_active
// Solo R1_DUENO. Usa service_role → bypassa RLS en branches.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    if (callerUser?.role !== 'R1_DUENO') return err(403, 'Solo el dueño puede gestionar sucursales')

    const body = await req.json()
    const { action } = body

    // ── Crear sucursal ─────────────────────────────────────────────────────────
    if (action === 'create') {
      const { nombre, direccion, horario_apertura, horario_cierre, telefono, edge_device_id } = body
      if (!nombre?.trim())    return err(400, 'El nombre es obligatorio')
      if (!direccion?.trim()) return err(400, 'La dirección es obligatoria')
      if (!horario_apertura)  return err(400, 'El horario de apertura es obligatorio')
      if (!horario_cierre)    return err(400, 'El horario de cierre es obligatorio')

      const { data: branch, error: insErr } = await admin
        .from('branches')
        .insert({
          name:           nombre.trim(),
          address:        direccion.trim(),
          phone:          telefono?.trim()      || null,
          opening_time:   horario_apertura,
          closing_time:   horario_cierre,
          edge_device_id: edge_device_id?.trim() || null,
          is_active:      true,
        })
        .select('id')
        .single()

      if (insErr) {
        const msg = insErr.message.includes('unique')
          ? 'Ya existe una sucursal con ese nombre'
          : insErr.message
        return err(500, msg)
      }

      return ok({ id: branch.id })
    }

    // ── Editar sucursal ────────────────────────────────────────────────────────
    if (action === 'update') {
      const { id, nombre, direccion, horario_apertura, horario_cierre, telefono, edge_device_id } = body
      if (!id) return err(400, 'id es obligatorio')

      const updates: Record<string, unknown> = {}
      if (nombre !== undefined)            updates.name           = nombre
      if (direccion !== undefined)         updates.address        = direccion
      if (telefono !== undefined)          updates.phone          = telefono || null
      if (horario_apertura !== undefined)  updates.opening_time   = horario_apertura
      if (horario_cierre !== undefined)    updates.closing_time   = horario_cierre
      if (edge_device_id !== undefined)    updates.edge_device_id = edge_device_id || null

      const { error: updErr } = await admin.from('branches').update(updates).eq('id', id)
      if (updErr) {
        const msg = updErr.message.includes('unique')
          ? 'Ya existe una sucursal con ese nombre'
          : updErr.message
        return err(500, msg)
      }

      return ok({ updated: true })
    }

    // ── Activar / Desactivar ───────────────────────────────────────────────────
    if (action === 'toggle_active') {
      const { id, is_active } = body
      if (!id)                  return err(400, 'id es obligatorio')
      if (is_active === undefined) return err(400, 'is_active es obligatorio')

      const { error: updErr } = await admin
        .from('branches')
        .update({ is_active })
        .eq('id', id)
      if (updErr) return err(500, updErr.message)

      return ok({ updated: true })
    }

    return err(400, `Acción desconocida: ${action}`)

  } catch (e) {
    return err(500, (e as Error).message)
  }
})

function ok(data: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ ok: true, ...data }),
    { headers: { ...CORS, 'Content-Type': 'application/json' }, status: 200 }
  )
}

function err(status: number, message: string) {
  return new Response(
    JSON.stringify({ ok: false, error: message }),
    { headers: { ...CORS, 'Content-Type': 'application/json' }, status }
  )
}
