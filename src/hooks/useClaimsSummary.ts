// src/hooks/useClaimsSummary.ts
// Carga claims de un usuario (lectura pura, sin mutación).
// Usa gestionar-claims action:'get' para bypasear RLS con service_role.

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ClaimKey, UserRole } from '../types'
import type { ClaimState } from './useUserClaims'

const ALL_CLAIMS: ClaimKey[] = [
  'can_export_db',
  'can_manage_roles',
  'can_view_financials',
  'can_register_payment',
]

export function useClaimsSummary(
  userId: string,
  role: UserRole,
  enabled: boolean,
  refreshTick: number
) {
  const [claimStates, setClaimStates] = useState<ClaimState[]>([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    if (!enabled || !userId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)

      const { data, error } = await supabase.functions.invoke('gestionar-claims', {
        body: { action: 'get', target_user_id: userId },
      })

      if (cancelled) return

      if (error || !data?.ok) {
        setLoading(false)
        return
      }

      const roleMap: Record<string, boolean> = {}
      for (const rc of data.role_claims as { claim: string; value: boolean }[]) {
        roleMap[rc.claim] = rc.value
      }

      const userMap: Record<string, boolean> = {}
      for (const uc of data.user_claims as { claim: string; value: boolean }[]) {
        userMap[uc.claim] = uc.value
      }

      const states = ALL_CLAIMS.map(key => {
        const roleDefault = roleMap[key] ?? false
        const value       = key in userMap ? userMap[key] : roleDefault
        return { key, roleDefault, value, isOverride: value !== roleDefault }
      })

      if (!cancelled) {
        setClaimStates(states)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [userId, enabled, refreshTick])

  return { claimStates, loading }
}
