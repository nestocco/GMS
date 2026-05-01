// src/hooks/useEditarSocio.ts
// Fetch del perfil completo de un socio (para prefill en modo edición)
// y PATCH via Edge Function 'editar-socio' (service_role, bypass RLS).

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface SocioProfileFull {
  first_name:            string
  last_name:             string
  dni:                   string | null
  birth_date:            string | null
  phone:                 string | null
  origin_channel:        string | null
  emergency_name:        string | null
  emergency_phone:       string | null
  medical_notes:         string | null
  guardian_user_id:      string | null
  guardian_name:         string | null
  guardian_dni:          string | null
  guardian_phone:        string | null
  guardian_relationship: string | null
  guardian_user_name:    string
}

export interface EditSocioPayload {
  socio_id:               string
  first_name:             string
  last_name:              string
  dni?:                   string | null
  birth_date?:            string | null
  phone?:                 string | null
  origin_channel?:        string | null
  emergency_name?:        string | null
  emergency_phone?:       string | null
  medical_notes?:         string | null
  guardian_user_id?:      string | null
  guardian_name?:         string | null
  guardian_dni?:          string | null
  guardian_phone?:        string | null
  guardian_relationship?: string | null
}

export function useEditarSocio(socioId: string | undefined) {
  const [profile, setProfile] = useState<SocioProfileFull | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!socioId) return
    setLoading(true)
    supabase.functions.invoke('editar-socio', {
      body: { action: 'get', socio_id: socioId },
    }).then(({ data, error: fnErr }) => {
      if (fnErr) {
        setError(fnErr.message)
      } else if (data?.ok) {
        setProfile(data.profile as SocioProfileFull)
      } else {
        setError(data?.error ?? 'Error al cargar el perfil')
      }
      setLoading(false)
    })
  }, [socioId])

  async function updateSocio(socioId: string, payload: Omit<EditSocioPayload, 'socio_id'>): Promise<boolean> {
    setSaving(true)
    setError(null)

    const { data, error: fnErr } = await supabase.functions.invoke('editar-socio', {
      body: { socio_id: socioId, ...payload },
    })

    if (fnErr) {
      let msg = fnErr.message
      try {
        const body = await (fnErr as any).context?.json()
        if (body?.error) msg = body.error
      } catch { /* ignorar */ }
      setError(msg)
      setSaving(false)
      return false
    }

    if (!data?.ok) {
      setError(data?.error ?? 'Error desconocido')
      setSaving(false)
      return false
    }

    setSaving(false)
    return true
  }

  function resetError() { setError(null) }

  return { profile, loading, saving, error, updateSocio, resetError }
}
