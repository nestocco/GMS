// supabase/functions/gestionar-leads/index.ts
// Acciones: create | list | update_estado | promote
// Solo para roles R1_DUENO, R2_ENCARGADO, R3_STAFF.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED = ['R1_DUENO', 'R2_ENCARGADO', 'R3_STAFF']

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
    if (!ALLOWED.includes(callerRole)) return err(403, 'Sin permiso')

    const body = await req.json()
    const { action } = body

    // ── Crear prospecto ───────────────────────────────────────────────────────
    if (action === 'create') {
      const { nombre, telefono, email, branch_id } = body
      if (!nombre?.trim()) return err(400, 'El nombre es obligatorio')
      if (!telefono && !email) return err(400, 'Ingresá al menos un dato de contacto')

      const { data: lead, error: insErr } = await admin
        .from('leads')
        .insert({
          nombre:    nombre.trim(),
          telefono:  telefono?.trim() || null,
          email:     email?.trim()    || null,
          branch_id: branch_id        || null,
          created_by: caller.id,
          estado: 'NUEVO',
        })
        .select('id')
        .single()
      if (insErr) return err(500, insErr.message)

      await admin.from('lead_state_log').insert({
        lead_id:     lead.id,
        estado_from: null,
        estado_to:   'NUEVO',
        changed_by:  caller.id,
        comentario:  'Prospecto registrado',
      })

      return ok({ id: lead.id })
    }

    // ── Listar prospectos ─────────────────────────────────────────────────────
    if (action === 'list') {
      const { estado } = body

      // Para R2/R3: filtrar por sucursales asignadas
      let branchFilter: string[] | null = null
      if (callerRole !== 'R1_DUENO') {
        const { data: assignments } = await admin
          .from('staff_assignments')
          .select('branch_id')
          .eq('user_id', caller.id)
          .eq('is_active', true)
        branchFilter = (assignments ?? []).map((a: any) => a.branch_id)
      }

      let query = admin
        .from('leads')
        .select('id, nombre, telefono, email, estado, notas, branch_id, created_by, promoted_to, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (estado)            query = query.eq('estado', estado)
      if (branchFilter !== null) {
        if (branchFilter.length > 0) {
          query = query.or(`branch_id.is.null,branch_id.in.(${branchFilter.join(',')})`)
        } else {
          query = query.is('branch_id', null)
        }
      }

      const { data: rows, error: listErr } = await query
      if (listErr) return err(500, listErr.message)

      // Enriquecer con nombre de sede y email del creador
      const branchIds  = [...new Set((rows ?? []).filter(l => l.branch_id).map(l => l.branch_id))]
      const creatorIds = [...new Set((rows ?? []).filter(l => l.created_by).map(l => l.created_by))]

      let branchMap:  Record<string, string> = {}
      let creatorMap: Record<string, string> = {}

      if (branchIds.length > 0) {
        const { data: branches } = await admin
          .from('branches')
          .select('id, nombre')
          .in('id', branchIds)
        branchMap = Object.fromEntries((branches ?? []).map((b: any) => [b.id, b.nombre]))
      }

      if (creatorIds.length > 0) {
        const { data: users } = await admin
          .from('users')
          .select('id, email')
          .in('id', creatorIds)
        creatorMap = Object.fromEntries((users ?? []).map((u: any) => [u.id, u.email]))
      }

      const leads = (rows ?? []).map(l => ({
        ...l,
        branch_nombre:  l.branch_id  ? (branchMap[l.branch_id]   ?? null) : null,
        creator_email:  l.created_by ? (creatorMap[l.created_by] ?? null) : null,
      }))

      return ok({ leads })
    }

    // ── Cambiar estado ────────────────────────────────────────────────────────
    if (action === 'update_estado') {
      const { lead_id, estado, comentario, socio_id } = body
      if (!lead_id) return err(400, 'lead_id es obligatorio')
      if (!estado)  return err(400, 'estado es obligatorio')

      const { data: lead, error: fetchErr } = await admin
        .from('leads')
        .select('estado, promoted_to')
        .eq('id', lead_id)
        .single()
      if (fetchErr || !lead) return err(404, 'Prospecto no encontrado')

      const updates: Record<string, unknown> = { estado }
      if (comentario) updates.notas = comentario

      // ADHERIDO requiere vinculación a un socio si aún no está vinculado
      if (estado === 'ADHERIDO' && !lead.promoted_to) {
        if (!socio_id) return err(400, 'Para marcar como Adherido es obligatorio vincular a un socio')

        const { data: existingLink } = await admin
          .from('leads')
          .select('id')
          .eq('promoted_to', socio_id)
          .neq('id', lead_id)
          .maybeSingle()
        if (existingLink) return err(409, 'Este socio ya está vinculado a otro prospecto')

        updates.promoted_to = socio_id
      }

      const { error: updErr } = await admin
        .from('leads')
        .update(updates)
        .eq('id', lead_id)
      if (updErr) return err(500, updErr.message)

      await admin.from('lead_state_log').insert({
        lead_id,
        estado_from: lead.estado,
        estado_to:   estado,
        comentario:  comentario || null,
        changed_by:  caller.id,
      })

      return ok({ updated: true })
    }

    // ── Promover a socio ──────────────────────────────────────────────────────
    // Llamado desde Prospectos.tsx como seguridad tras el flujo "Hacer socio".
    // crear-socio ya vincula automáticamente; este action es el respaldo.
    if (action === 'promote') {
      const { lead_id, user_id } = body
      if (!lead_id) return err(400, 'lead_id es obligatorio')
      if (!user_id) return err(400, 'user_id es obligatorio')

      const { data: lead, error: fetchErr } = await admin
        .from('leads')
        .select('estado, promoted_to')
        .eq('id', lead_id)
        .single()
      if (fetchErr || !lead) return err(404, 'Prospecto no encontrado')

      // No-op: crear-socio ya vinculó este lead al mismo socio
      if (lead.promoted_to === user_id) return ok({ promoted: true })

      // El lead fue vinculado a otro socio (raro pero posible por auto-link)
      if (lead.promoted_to && lead.promoted_to !== user_id) {
        return ok({ promoted: true })
      }

      // Verificar que este socio no está ya vinculado a otro lead
      const { data: existingLink } = await admin
        .from('leads')
        .select('id')
        .eq('promoted_to', user_id)
        .neq('id', lead_id)
        .maybeSingle()
      if (existingLink) return ok({ promoted: true })

      const { error: updErr } = await admin
        .from('leads')
        .update({ estado: 'ADHERIDO', promoted_to: user_id })
        .eq('id', lead_id)
      if (updErr) return err(500, updErr.message)

      await admin.from('lead_state_log').insert({
        lead_id,
        estado_from: lead.estado,
        estado_to:   'ADHERIDO',
        comentario:  'Convertido a socio',
        changed_by:  caller.id,
      })

      return ok({ promoted: true })
    }

    // ── Listar socios vinculables para una sucursal ───────────────────────────
    if (action === 'list_socios_by_branch') {
      const { branch_id } = body

      let memQuery = admin
        .from('memberships')
        .select('user_id')
        .neq('status', 'CANCELADA')

      if (branch_id) memQuery = memQuery.eq('branch_id', branch_id)

      const { data: memData, error: memErr } = await memQuery
      if (memErr) return err(500, memErr.message)

      const memberIds = [...new Set((memData ?? []).map((m: any) => m.user_id as string))]
      if (memberIds.length === 0) return ok({ socios: [] })

      // Excluir socios ya vinculados a algún lead
      const { data: linkedData } = await admin
        .from('leads')
        .select('promoted_to')
        .not('promoted_to', 'is', null)

      const linkedSet = new Set((linkedData ?? []).map((l: any) => l.promoted_to as string))
      const availableIds = memberIds.filter(id => !linkedSet.has(id))
      if (availableIds.length === 0) return ok({ socios: [] })

      const { data: profiles } = await admin
        .from('socio_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', availableIds)

      const { data: usersData } = await admin
        .from('users')
        .select('id, email')
        .in('id', availableIds)
        .eq('role', 'R5_SOCIO')

      const profileMap: Record<string, any> = Object.fromEntries(
        (profiles ?? []).map((p: any) => [p.user_id, p])
      )
      const emailMap: Record<string, string> = Object.fromEntries(
        (usersData ?? []).map((u: any) => [u.id, u.email])
      )

      const socios = availableIds
        .filter(id => profileMap[id] && emailMap[id])
        .map(id => ({
          user_id:    id,
          first_name: profileMap[id].first_name as string,
          last_name:  profileMap[id].last_name  as string,
          email:      emailMap[id],
        }))
        .sort((a, b) =>
          `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'es')
        )

      return ok({ socios })
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
