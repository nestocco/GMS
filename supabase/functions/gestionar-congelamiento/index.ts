// supabase/functions/gestionar-congelamiento/index.ts
// Acciones:
//   'get_estado' → R5_SOCIO: cuota disponible y estado de freeze de la membresía propia
//   'solicitar'  → R5_SOCIO: genera alerta CONGELAMIENTO sin cambiar estado (pide al staff)
//   'aplicar'    → R1/R2/R3: aplica el freeze, extiende end_date, registra en historial
//   'descongelar'→ R1/R2/R3: cierra el freeze, ajusta end_date a días reales, registra historial

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

function calcDiasUsados(freezeStartDate: string, freezeDays: number, now: Date): number {
  const start  = new Date(freezeStartDate)
  const diff   = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, Math.min(diff, freezeDays))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return err(401, 'Sin autorización')

    const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
    const ANON_KEY          = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller }, error: authErr } = await anonClient.auth.getUser()
    if (authErr || !caller) return err(401, 'Sesión inválida')

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: callerUser } = await admin
      .from('users').select('role').eq('id', caller.id).single()
    const role: string = callerUser?.role ?? ''

    const body   = await req.json()
    const action = body?.action as string

    // ── get_estado ─────────────────────────────────────────────────────────────
    if (action === 'get_estado') {
      if (role !== 'R5_SOCIO') return err(403, 'Solo para socios')

      const { data: mem, error: memErr } = await admin
        .from('memberships')
        .select('id, status, freeze_days_quota, freeze_days_used, freeze_start_date, freeze_end_date, freeze_days, plans:plan_id (freeze_days_quota)')
        .eq('user_id', caller.id)
        .not('status', 'eq', 'CANCELADA')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (memErr) return err(500, `Error al consultar membresía: ${memErr.message}`)
      if (!mem) return ok({ sin_membresia: true })

      const planQuota      = (mem.plans as any)?.freeze_days_quota ?? 0
      const quota          = mem.freeze_days_quota > 0 ? mem.freeze_days_quota : planQuota
      const usados         = mem.freeze_days_used ?? 0

      return ok({
        membership_id:       mem.id,
        status:              mem.status,
        dias_quota:          quota,
        dias_usados:         usados,
        dias_disponibles:    Math.max(0, quota - usados),
        plan_permite_freeze: planQuota > 0,
        freeze_activo:       mem.status === 'CONGELADA',
        freeze_start_date:   mem.freeze_start_date ?? null,
        freeze_end_date:     mem.freeze_end_date ?? null,
      })
    }

    // ── solicitar ──────────────────────────────────────────────────────────────
    if (action === 'solicitar') {
      if (role !== 'R5_SOCIO') return err(403, 'Solo para socios')

      const { freeze_start_date, freeze_days, reason } = body
      if (!freeze_start_date || !freeze_days || freeze_days < 1)
        return err(400, 'Fecha de inicio y días requeridos')

      const { data: mem, error: memErr2 } = await admin
        .from('memberships')
        .select('id, status, freeze_days_quota, freeze_days_used, branch_id, plans:plan_id (freeze_days_quota, name)')
        .eq('user_id', caller.id)
        .eq('status', 'ACTIVA')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (memErr2) return err(500, `Error al consultar membresía: ${memErr2.message}`)
      if (!mem) return err(400, 'No tenés una membresía activa para congelar')

      const planQuota   = (mem.plans as any)?.freeze_days_quota ?? 0
      if (planQuota === 0) return err(400, 'Tu plan no incluye días de congelamiento')

      const quota       = mem.freeze_days_quota > 0 ? mem.freeze_days_quota : planQuota
      const usados      = mem.freeze_days_used ?? 0
      const disponibles = Math.max(0, quota - usados)
      if (freeze_days > disponibles)
        return err(400, `Solo quedan ${disponibles} días disponibles de congelamiento`)

      const { data: profile } = await admin
        .from('socio_profiles')
        .select('first_name, last_name')
        .eq('user_id', caller.id)
        .single()

      const nombreSocio = profile
        ? `${profile.first_name} ${profile.last_name}`.trim()
        : caller.email ?? 'Socio'

      const freezeEnd = new Date(freeze_start_date)
      freezeEnd.setDate(freezeEnd.getDate() + freeze_days)

      const { error: alertErr } = await admin.from('alerts').insert({
        tipo:        'CONGELAMIENTO',
        severidad:   'INFORMATIVA',
        estado:      'PENDIENTE',
        titulo:      `Solicitud de congelamiento — ${nombreSocio}`,
        descripcion: `Solicita ${freeze_days} día(s) desde ${freeze_start_date}. Motivo: ${reason?.trim() ?? 'No especificado'}.`,
        branch_id:   mem.branch_id ?? null,
        socio_id:    caller.id,
        metadata: {
          membership_id:     mem.id,
          freeze_start_date,
          freeze_end_date:   freezeEnd.toISOString().split('T')[0],
          freeze_days,
          reason:            reason?.trim() ?? '',
          plan_nombre:       (mem.plans as any)?.name ?? '',
        },
      })
      if (alertErr) return err(500, `Error al registrar solicitud: ${alertErr.message}`)

      return ok({ mensaje: 'Solicitud enviada. El staff la procesará a la brevedad.' })
    }

    // ── aplicar ────────────────────────────────────────────────────────────────
    if (action === 'aplicar') {
      const STAFF_ROLES = ['R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF']
      if (!STAFF_ROLES.includes(role)) return err(403, 'Sin permiso para aplicar congelamiento')

      const { membership_id, freeze_start_date, freeze_days, reason } = body
      if (!membership_id || !freeze_start_date || !freeze_days || freeze_days < 1)
        return err(400, 'membership_id, fecha de inicio y días son requeridos')

      const { data: mem } = await admin
        .from('memberships')
        .select('id, status, end_date, freeze_days_quota, freeze_days_used, plans:plan_id (freeze_days_quota)')
        .eq('id', membership_id)
        .single()

      if (!mem) return err(404, 'Membresía no encontrada')
      if (mem.status !== 'ACTIVA' && mem.status !== 'EN_GRACIA')
        return err(400, `La membresía está en estado ${mem.status}, no se puede congelar`)

      const planQuota   = (mem.plans as any)?.freeze_days_quota ?? 0
      const quota       = mem.freeze_days_quota > 0 ? mem.freeze_days_quota : planQuota
      if (quota === 0) return err(400, 'El plan no incluye días de congelamiento')

      const usados      = mem.freeze_days_used ?? 0
      const disponibles = Math.max(0, quota - usados)
      if (freeze_days > disponibles)
        return err(400, `Solo quedan ${disponibles} días disponibles`)

      const freezeEnd = new Date(freeze_start_date)
      freezeEnd.setDate(freezeEnd.getDate() + freeze_days)

      const newEndDate = new Date(mem.end_date)
      newEndDate.setDate(newEndDate.getDate() + freeze_days)

      const { error: updErr } = await admin
        .from('memberships')
        .update({
          status:             'CONGELADA',
          freeze_start_date:  new Date(freeze_start_date).toISOString(),
          freeze_end_date:    freezeEnd.toISOString(),
          freeze_days:        freeze_days,
          freeze_reason:      reason?.trim() ?? null,
          freeze_approved_by: caller.id,
          end_date:           newEndDate.toISOString(),
          freeze_days_used:   usados + freeze_days,
          original_end_date:  mem.end_date,
        })
        .eq('id', membership_id)

      if (updErr) return err(500, updErr.message)

      await admin.from('membership_state_log').insert({
        membership_id,
        from_status: mem.status,
        to_status:   'CONGELADA',
        changed_by:  caller.id,
        notes:       reason?.trim() ?? null,
        metadata: {
          freeze_start_date,
          freeze_end_date: freezeEnd.toISOString().split('T')[0],
          freeze_days,
        },
      })

      return ok({ new_end_date: newEndDate.toISOString().split('T')[0] })
    }

    // ── descongelar ────────────────────────────────────────────────────────────
    if (action === 'descongelar') {
      const STAFF_ROLES = ['R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF']
      if (!STAFF_ROLES.includes(role)) return err(403, 'Sin permiso para descongelar')

      const { membership_id } = body
      if (!membership_id) return err(400, 'membership_id requerido')

      const { data: mem } = await admin
        .from('memberships')
        .select('id, status, end_date, freeze_start_date, freeze_end_date, freeze_days, freeze_days_used')
        .eq('id', membership_id)
        .single()

      if (!mem) return err(404, 'Membresía no encontrada')
      if (mem.status !== 'CONGELADA') return err(400, 'La membresía no está congelada')

      const now          = new Date()
      const diasUsados   = calcDiasUsados(mem.freeze_start_date, mem.freeze_days ?? 0, now)
      const diasNoUsados = (mem.freeze_days ?? 0) - diasUsados

      const newEndDate   = new Date(mem.end_date)
      newEndDate.setDate(newEndDate.getDate() - diasNoUsados)

      // Corregir freeze_days_used: se había reservado freeze_days al aplicar,
      // ahora ajustamos a los días reales.
      const usadosCorregidos = Math.max(0, (mem.freeze_days_used ?? 0) - (mem.freeze_days ?? 0) + diasUsados)

      const { error: updErr } = await admin
        .from('memberships')
        .update({
          status:          'ACTIVA',
          end_date:        newEndDate.toISOString(),
          freeze_end_date: now.toISOString(),
          freeze_days_used: usadosCorregidos,
        })
        .eq('id', membership_id)

      if (updErr) return err(500, updErr.message)

      await admin.from('membership_state_log').insert({
        membership_id,
        from_status: 'CONGELADA',
        to_status:   'ACTIVA',
        changed_by:  caller.id,
        notes:       `Congelamiento finalizado. Días efectivos: ${diasUsados}. Nuevo vencimiento: ${newEndDate.toISOString().split('T')[0]}.`,
        metadata: {
          freeze_start_date:    mem.freeze_start_date,
          freeze_end_date_orig: mem.freeze_end_date,
          freeze_end_date_real: now.toISOString(),
          dias_planificados:    mem.freeze_days,
          dias_efectivos:       diasUsados,
          new_end_date:         newEndDate.toISOString().split('T')[0],
        },
      })

      return ok({
        dias_usados:  diasUsados,
        new_end_date: newEndDate.toISOString().split('T')[0],
      })
    }

    return err(400, `Acción desconocida: ${action}`)

  } catch (e: any) {
    return err(500, e?.message ?? 'Error interno')
  }
})
