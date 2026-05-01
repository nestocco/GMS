// src/hooks/usePermissions.ts
// Fetches role_claims (defaults) + user_claims (overrides) from Supabase.
// Merges them: user_claims have precedence over role_claims.

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { UserRole, ClaimKey, ClaimsMap } from '../types'

const ALL_CLAIMS: ClaimKey[] = [
  'can_export_db',
  'can_manage_roles',
  'can_view_financials',
  'can_register_payment',
]

const DEFAULT_DENY: ClaimsMap = {
  can_export_db:        false,
  can_manage_roles:     false,
  can_view_financials:  false,
  can_register_payment: false,
}

export function usePermissions(userId: string, role: UserRole) {
  const [claims, setClaims]   = useState<ClaimsMap>(DEFAULT_DENY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      // 1. Role defaults
      const { data: roleClaims } = await supabase
        .from('role_claims')
        .select('claim, value')
        .eq('role', role)

      // 2. User-level overrides
      const { data: userClaims } = await supabase
        .from('user_claims')
        .select('claim, value')
        .eq('user_id', userId)

      if (cancelled) return

      // 3. Merge: start with safe deny-all, apply role defaults, then user overrides
      const merged: ClaimsMap = { ...DEFAULT_DENY }

      for (const rc of roleClaims ?? []) {
        if (ALL_CLAIMS.includes(rc.claim as ClaimKey)) {
          merged[rc.claim as ClaimKey] = rc.value
        }
      }
      for (const uc of userClaims ?? []) {
        if (ALL_CLAIMS.includes(uc.claim as ClaimKey)) {
          merged[uc.claim as ClaimKey] = uc.value
        }
      }

      setClaims(merged)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [userId, role])

  return { claims, loading }
}
