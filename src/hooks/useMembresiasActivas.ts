// src/hooks/useMembresiasActivas.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { MembresiaActiva } from '../types'

export function useMembresiasActivas() {
  const [membresias, setMembresias] = useState<MembresiaActiva[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMembresias() {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('memberships')
        .select(`
          id,
          status,
          start_date,
          end_date,
          final_price,
          discount_pct,
          base_price,
          freeze_days_used,
          freeze_days_quota,
          freeze_start_date,
          freeze_end_date,
          cuota2_due_date,
          created_at,
          branches:branch_id (
            name
          ),
          plans:plan_id (
            name,
            level,
            duration_days
          ),
          socios:user_id (
            id,
            email,
            socio_profiles!socio_profiles_user_id_fkey (
              first_name,
              last_name,
              dni
            )
          )
        `)
        .not('status', 'eq', 'CANCELADA')
        .order('created_at', { ascending: false })

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      const transformed: MembresiaActiva[] = (data ?? []).map((m: any) => {
        const profile = m.socios?.socio_profiles
        const socioName = profile
          ? `${profile.first_name} ${profile.last_name}`.trim()
          : m.socios?.email ?? '—'

        const today = new Date()
        const endDate = new Date(m.end_date)
        const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        const formatDate = (d: string | null) =>
          d
            ? new Date(d).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
            : '—'

        return {
          id: m.id,
          socioId: m.socios?.id ?? '',
          socio: socioName,
          dni: profile?.dni ?? '—',
          plan: m.plans?.name ?? '—',
          nivel: m.plans?.level ?? '—',
          status: m.status,
          sede: m.branches?.name ?? '—',
          inicio: formatDate(m.start_date),
          vencimiento: formatDate(m.end_date),
          diasRestantes: diffDays,
          precioBase: m.base_price,
          descuentoPct: Number(m.discount_pct),
          precioFinal: m.final_price,
          freezeDiasUsados: m.freeze_days_used,
          freezeDiasQuota: m.freeze_days_quota,
          cuota2Vence: formatDate(m.cuota2_due_date),
          freezeStartDate: formatDate(m.freeze_start_date),
          freezeEndDate: formatDate(m.freeze_end_date),
        }
      })

      setMembresias(transformed)
      setLoading(false)
    }

    fetchMembresias()
  }, [])

  return { membresias, loading, error }
}
