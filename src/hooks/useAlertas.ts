// src/hooks/useAlertas.ts
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Alerta, AlertaTipo } from '../types'

const ACCION_BY_TIPO: Record<AlertaTipo, string> = {
  IMPAGO:          'Contactar al socio para regularizar el pago. Verificar si solicitó congelamiento o prórroga.',
  DESERCION:       'Contactar al socio por WhatsApp o email. Ofrecer una promoción de retención.',
  ANOMALIA:        'Verificar el historial de accesos del socio. Si el patrón es sospechoso, revocar acceso temporalmente.',
  INFRAESTRUCTURA: 'Verificar la conectividad del dispositivo edge en la sucursal indicada.',
  CONGELAMIENTO:   'Revisar la solicitud de congelamiento y procesarla desde el módulo de membresías.',
}

function toAlerta(a: any): Alerta {
  const dt    = new Date(a.created_at)
  const fecha = dt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora  = dt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs'
  const tipo  = a.tipo as AlertaTipo

  const sp          = a.users?.socio_profiles
  const socioNombre = sp ? `${sp.first_name} ${sp.last_name}`.trim() : undefined
  const socioDni    = sp?.dni

  return {
    id:              a.id,
    branch_id:       a.branch_id,
    tipo,
    severidad:       a.severidad,
    estado:          a.estado,
    titulo:          a.titulo,
    descripcion:     a.descripcion ?? null,
    sede:            a.branches?.name ?? '—',
    fecha,
    hora,
    socio_id:        a.socio_id ?? null,
    socio_nombre:    socioNombre,
    socio_dni:       socioDni,
    edge_device_id:  a.edge_device_id ?? null,
    accion_sugerida: ACCION_BY_TIPO[tipo] ?? 'Revisar el caso manualmente.',
    resolved_at:     a.resolved_at ?? null,
  }
}

const SELECT = `
  *,
  branches!alerts_branch_id_fkey (name),
  users!alerts_socio_id_fkey (
    socio_profiles!socio_profiles_user_id_fkey (first_name, last_name, dni)
  )
`

export function useAlertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetch() {
      setLoading(true)
      setError(null)

      const desde = new Date()
      desde.setDate(1)
      desde.setHours(0, 0, 0, 0)

      const { data, error: err } = await supabase
        .from('alerts')
        .select(SELECT)
        .gte('created_at', desde.toISOString())
        .order('created_at', { ascending: false })

      if (cancelled) return
      if (err) { setError(err.message); setLoading(false); return }

      setAlertas((data ?? []).map(toAlerta))
      setLoading(false)
    }

    fetch()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' },
        async ({ new: row }) => {
          const { data } = await supabase
            .from('alerts').select(SELECT)
            .eq('id', (row as any).id).maybeSingle()
          if (data) setAlertas(prev => [toAlerta(data), ...prev])
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alerts' },
        ({ new: row }) => {
          setAlertas(prev => prev.map(a =>
            a.id === (row as any).id
              ? { ...a, estado: (row as any).estado, resolved_at: (row as any).resolved_at }
              : a
          ))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const resolveAlerta = useCallback(async (id: string, userId: string) => {
    const { error: err } = await supabase
      .from('alerts')
      .update({ estado: 'RESUELTA', resolved_at: new Date().toISOString(), resolved_by: userId })
      .eq('id', id)
    if (err) throw err
  }, [])

  const ignoreAlerta = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('alerts')
      .update({ estado: 'IGNORADA' })
      .eq('id', id)
    if (err) throw err
  }, [])

  return { alertas, loading, error, resolveAlerta, ignoreAlerta }
}
