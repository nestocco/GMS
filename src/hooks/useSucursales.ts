// src/hooks/useSucursales.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Sucursal, SucursalInput } from '../types'

export function useSucursales() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchAll() {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from('branches')
      .select('*')
      .order('name', { ascending: true })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    const branchIds = (data ?? []).map((b: any) => b.id)

    const [membershipsRes, staffRes] = await Promise.all([
      supabase
        .from('memberships')
        .select('branch_id')
        .in('status', ['ACTIVA', 'EN_GRACIA'])
        .in('branch_id', branchIds),
      supabase
        .from('staff_assignments')
        .select('branch_id')
        .eq('is_active', true)
        .in('branch_id', branchIds),
    ])

    const memberCount: Record<string, number> = {}
    const staffCount: Record<string, number> = {}

    for (const m of membershipsRes.data ?? []) {
      memberCount[m.branch_id] = (memberCount[m.branch_id] ?? 0) + 1
    }
    for (const s of staffRes.data ?? []) {
      staffCount[s.branch_id] = (staffCount[s.branch_id] ?? 0) + 1
    }

    const transformed: Sucursal[] = (data ?? []).map((b: any) => ({
      id: b.id,
      nombre: b.name,
      direccion: b.address ?? '—',
      telefono: b.phone ?? null,
      horario_apertura: b.opening_time ?? '—',
      horario_cierre: b.closing_time ?? '—',
      edge_device_id: b.edge_device_id ?? null,
      edge_estado: (b.edge_device_id ? 'ONLINE' : 'SIN_DISPOSITIVO') as Sucursal['edge_estado'],
      edge_ultima_sync: b.edge_ultima_sync ?? null,
      is_active: b.is_active,
      socios_activos: memberCount[b.id] ?? 0,
      staff_count: staffCount[b.id] ?? 0,
    }))

    setSucursales(transformed)
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    fetchAll().then(() => { if (cancelled) return })
    return () => { cancelled = true }
  }, [])

  async function createSucursal(input: SucursalInput): Promise<void> {
    const { data, error: fnErr } = await supabase.functions.invoke('gestionar-sucursales', {
      body: {
        action:          'create',
        nombre:          input.nombre,
        direccion:       input.direccion,
        horario_apertura: input.horario_apertura,
        horario_cierre:  input.horario_cierre,
        telefono:        input.telefono,
        edge_device_id:  input.edge_device_id,
      },
    })
    if (fnErr || !data?.ok) throw new Error(data?.error ?? fnErr?.message ?? 'Error al crear sucursal')
    await fetchAll()
  }

  async function updateSucursal(id: string, input: Partial<SucursalInput>): Promise<void> {
    const { data, error: fnErr } = await supabase.functions.invoke('gestionar-sucursales', {
      body: { action: 'update', id, ...input },
    })
    if (fnErr || !data?.ok) throw new Error(data?.error ?? fnErr?.message ?? 'Error al actualizar sucursal')
    await fetchAll()
  }

  async function toggleActive(id: string, currentState: boolean): Promise<void> {
    const { data, error: fnErr } = await supabase.functions.invoke('gestionar-sucursales', {
      body: { action: 'toggle_active', id, is_active: !currentState },
    })
    if (fnErr || !data?.ok) throw new Error(data?.error ?? fnErr?.message ?? 'Error al cambiar estado')
    await fetchAll()
  }

  return { sucursales, loading, error, createSucursal, updateSucursal, toggleActive }
}
