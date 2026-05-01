// src/hooks/useUserClaims.ts
// Lee role_claims + user_claims via edge function (service_role, bypassa RLS).
// Los toggles son puramente locales — nada va a la BD hasta que se llama applyChanges().

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { ClaimKey, UserRole } from '../types'

const ALL_CLAIMS: ClaimKey[] = [
  'can_export_db',
  'can_manage_roles',
  'can_view_financials',
  'can_register_payment',
]

export interface ClaimState {
  key: ClaimKey
  value: boolean       // valor efectivo local (puede diferir de BD hasta applyChanges)
  roleDefault: boolean // valor que da el rol sin override
  isOverride: boolean  // true = valor local difiere del default del rol
}

export function useUserClaims(userId: string, role: UserRole) {
  const [serverStates, setServerStates] = useState<ClaimState[]>([])
  const [localStates, setLocalStates]   = useState<ClaimState[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    // user_claims de otro usuario está bloqueada por RLS para el cliente anon —
    // se lee via edge function con service_role.
    const { data, error: fnErr } = await supabase.functions.invoke('gestionar-claims', {
      body: { action: 'get', target_user_id: userId },
    })

    if (fnErr || !data?.ok) {
      setError(data?.error ?? fnErr?.message ?? 'Error al cargar permisos')
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

    setServerStates(states)
    setLocalStates(states)
    setLoading(false)
  }, [userId])

  useEffect(() => { load() }, [load])

  // Actualiza solo el estado local — sin llamadas a la BD.
  const toggle = useCallback((key: ClaimKey, newValue: boolean) => {
    setLocalStates(prev => prev.map(s => {
      if (s.key !== key) return s
      return { ...s, value: newValue, isOverride: newValue !== s.roleDefault }
    }))
  }, [])

  // true cuando hay al menos un claim local que difiere del estado del servidor.
  const hasPendingChanges = useMemo(
    () => localStates.some((s, i) => s.value !== serverStates[i]?.value),
    [localStates, serverStates]
  )

  // Revierte el estado local al estado del servidor sin cerrar el panel.
  const discardChanges = useCallback(() => {
    setLocalStates(serverStates)
  }, [serverStates])

  // Envía en paralelo solo los claims que cambiaron. No recarga (el panel se cierra antes).
  const applyChanges = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const changes = localStates.filter((s, i) => s.value !== serverStates[i]?.value)
    if (changes.length === 0) return { ok: true }

    const results = await Promise.all(
      changes.map(s =>
        supabase.functions.invoke('gestionar-claims', {
          body: { target_user_id: userId, claim: s.key, new_value: s.value },
        })
      )
    )

    const failed = results.find(r => r.error || !r.data?.ok)
    if (failed) {
      return { ok: false, error: failed.data?.error ?? failed.error?.message ?? 'Error al aplicar cambios' }
    }

    return { ok: true }
  }, [localStates, serverStates, userId])

  return {
    claimStates: localStates,
    loading,
    error,
    toggle,
    hasPendingChanges,
    discardChanges,
    applyChanges,
    reload: load,
  }
}
