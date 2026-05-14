import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { PlanNivel } from '../types'

interface PlanPayload {
  nombre: string
  nivel: PlanNivel
  duracion: number
  precio: number
  freezeDias: number
}

export function useMutarPlan() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function invocar(action: string, payload: Record<string, unknown>): Promise<boolean> {
    setLoading(true)
    setError(null)
    const { data, error: fnErr } = await supabase.functions.invoke('gestionar-planes', {
      body: { action, ...payload },
    })
    setLoading(false)
    if (fnErr || !data?.ok) {
      setError(data?.error ?? fnErr?.message ?? 'Error desconocido')
      return false
    }
    return true
  }

  return {
    loading,
    error,
    clearError: () => setError(null),
    crear:       (p: PlanPayload)                    => invocar('crear', p),
    editar:      (plan_id: string, p: PlanPayload)   => invocar('editar', { plan_id, ...p }),
    toggleActivo:(plan_id: string, activo: boolean)  => invocar('toggleActivo', { plan_id, activo }),
  }
}
