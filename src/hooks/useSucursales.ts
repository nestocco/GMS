// src/hooks/useSucursales.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Sucursal } from '../types'

export function useSucursales() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSucursales() {
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

      // Para cada sucursal, contar miembros activos y staff
      const branchIds = (data ?? []).map((b: any) => b.id)

      const [membershipsRes, staffRes] = await Promise.all([
        supabase
          .from('memberships')
          .select('branch_id')
          .in('status', ['ACTIVA', 'EN_GRACIA', 'IMPAGO', 'CONGELADA'])
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
        telefono: b.phone ?? '—',
        horario_apertura: b.opening_time ?? '—',
        horario_cierre: b.closing_time ?? '—',
        edge_device_id: b.edge_device_id ?? '—',
        edge_estado: (b.edge_device_id ? 'ONLINE' : 'OFFLINE') as 'ONLINE' | 'OFFLINE' | 'ADVERTENCIA',
        edge_ultima_sync: '—',
        is_active: b.is_active,
        socios_activos: memberCount[b.id] ?? 0,
        staff_count: staffCount[b.id] ?? 0,
      }))

      setSucursales(transformed)
      setLoading(false)
    }

    fetchSucursales()
  }, [])

  return { sucursales, loading, error }
}
