// src/hooks/usePlanes.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Plan } from '../types'

const LEVEL_ORDER: Record<string, number> = {
  BASICO: 0,
  SILVER: 1,
  GOLD: 2,
  VIP: 3,
  PREMIUM: 4,
}

export function usePlanes() {
  const [planes, setPlanes] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPlanes() {
      setLoading(true)
      setError(null)

      // Fetch plans
      const { data: plansData, error: plansErr } = await supabase
        .from('plans')
        .select('*')

      if (plansErr) {
        setError(plansErr.message)
        setLoading(false)
        return
      }

      // Count active socios per plan
      const { data: membershipCounts, error: countErr } = await supabase
        .from('memberships')
        .select('plan_id')
        .in('status', ['ACTIVA', 'EN_GRACIA', 'IMPAGO', 'CONGELADA'])

      if (countErr) {
        setError(countErr.message)
        setLoading(false)
        return
      }

      const countMap: Record<string, number> = {}
      for (const m of membershipCounts ?? []) {
        countMap[m.plan_id] = (countMap[m.plan_id] ?? 0) + 1
      }

      const transformed: Plan[] = (plansData ?? [])
        .map((p: any) => ({
          id: p.id,
          nombre: p.name,
          nivel: p.level,
          duracion: p.duration_days,
          precio: p.base_price,
          activo: p.is_active,
          socios: countMap[p.id] ?? 0,
          freezeDias: p.freeze_days_quota,
        }))
        .sort(
          (a: Plan, b: Plan) =>
            (LEVEL_ORDER[a.nivel] ?? 99) - (LEVEL_ORDER[b.nivel] ?? 99)
        )

      setPlanes(transformed)
      setLoading(false)
    }

    fetchPlanes()
  }, [])

  return { planes, loading, error }
}
