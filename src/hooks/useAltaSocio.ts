// src/hooks/useAltaSocio.ts
// Delega la creación del socio a la Edge Function 'crear-socio'.
// La función corre con service_role: crea auth user sin email confirmation,
// inserta public.users, socio_profiles, memberships y payments atómicamente.

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export interface AltaSocioPayload {
  // Fase 1
  email: string
  password: string
  // Fase 2
  first_name: string
  last_name: string
  dni?: string
  birth_date?: string
  phone?: string
  origin_channel?: string
  // Fase 3
  emergency_name?: string
  emergency_phone?: string
  medical_notes?: string
  terms_accepted_at?: string
  // Tutor/representante
  guardian_user_id?: string
  guardian_name?: string
  guardian_dni?: string
  guardian_phone?: string
  guardian_relationship?: string
  // Fase 4
  branch_id: string
  plan_id: string
  plan_duration_days: number
  base_price: number
  final_price: number
  metodo_pago: string
  payment_type: string
}

export function useAltaSocio() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function crearSocio(payload: AltaSocioPayload): Promise<boolean> {
    setLoading(true)
    setError(null)

    const { data, error: fnErr } = await supabase.functions.invoke('crear-socio', {
      body: payload,
    })

    if (fnErr) {
      // Extraer mensaje real del cuerpo de la respuesta
      let msg = fnErr.message
      try {
        const body = await (fnErr as any).context?.json()
        if (body?.error) msg = body.error
      } catch { /* ignorar */ }
      setError(msg)
      setLoading(false)
      return false
    }

    if (!data?.ok) {
      setError(data?.error ?? 'Error desconocido')
      setLoading(false)
      return false
    }

    setLoading(false)
    return true
  }

  function resetError() { setError(null) }

  return { crearSocio, loading, error, resetError }
}
