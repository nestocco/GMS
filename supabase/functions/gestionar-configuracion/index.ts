// supabase/functions/gestionar-configuracion/index.ts
// Acciones: get | set
// get → cualquier rol autenticado (settings necesarios al login)
// set → solo R1_DUENO

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Claves permitidas para escritura (whitelist de seguridad)
const WRITABLE_KEYS = new Set([
  'discount_cap',
  'discount_alloc_cont',
  'discount_alloc_vol',
  'discount_alloc_nivel',
  'discount_alloc_freq',
  'anomaly_multidevice_count',
  'anomaly_multidevice_window',
  'anomaly_daily_entries',
  'anomaly_geo_branches',
  'anomaly_geo_window',
  'anomaly_inactivity_days',
  'session_inactivity_minutes',
  'session_max_hours',
])

function ok(data: object) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function err(status: number, error: string) {
  return new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return err(401, 'Sin autorización')

    const url  = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const svc  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const anonClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: authErr } = await anonClient.auth.getUser()
    if (authErr || !caller) return err(401, 'Sesión inválida')

    const admin = createClient(url, svc)

    const { data: callerUser } = await admin
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single()

    const callerRole: string = callerUser?.role ?? ''

    const body   = await req.json()
    const action = body.action as string

    // ── get: devuelve todos los settings como { key: value } ─────────────────
    if (action === 'get') {
      const { data, error: dbErr } = await admin
        .from('gym_settings')
        .select('key, value')
        .in('key', [...WRITABLE_KEYS])

      if (dbErr) return err(500, dbErr.message)

      const settings: Record<string, number> = {}
      for (const row of data ?? []) {
        settings[row.key] = Number(row.value)
      }

      return ok({ settings })
    }

    // ── set: actualiza settings (solo R1_DUENO) ───────────────────────────────
    if (action === 'set') {
      if (callerRole !== 'R1_DUENO') return err(403, 'Sin permiso')

      const { settings } = body as { settings: Record<string, number> }
      if (!settings || typeof settings !== 'object') return err(400, 'Parámetro settings requerido')

      const updates = Object.entries(settings)
        .filter(([key]) => WRITABLE_KEYS.has(key))
        .map(([key, value]) => ({ key, value: String(value) }))

      if (updates.length === 0) return err(400, 'Ninguna clave válida para actualizar')

      for (const { key, value } of updates) {
        const { error: upErr } = await admin
          .from('gym_settings')
          .upsert({ key, value, description: undefined }, { onConflict: 'key', ignoreDuplicates: false })

        if (upErr) return err(500, `Error al guardar ${key}: ${upErr.message}`)
      }

      return ok({ updated: updates.length })
    }

    return err(400, `Acción desconocida: ${action}`)
  } catch (e: any) {
    return err(500, e.message ?? 'Error interno')
  }
})
