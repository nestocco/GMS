// src/hooks/useAppSettings.ts
// Carga la configuración global desde gym_settings y la escribe en localStorage
// para que useAuth.ts pueda leerla en sus chequeos de sesión.

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { KEY_SESSION_HOURS, KEY_INACTIVITY_MINUTES } from './useAuth'

export interface AppSettings {
  // Algoritmo de descuento (tope + asignación por factor)
  discount_cap:         number
  discount_alloc_cont:  number
  discount_alloc_vol:   number
  discount_alloc_nivel: number
  discount_alloc_freq:  number
  // Motor de anomalías
  anomaly_multidevice_count:  number
  anomaly_multidevice_window: number
  anomaly_daily_entries:      number
  anomaly_geo_branches:       number
  anomaly_geo_window:         number
  anomaly_inactivity_days:    number
  // Seguridad de sesión
  session_inactivity_minutes: number
  session_max_hours:          number
}

export const DEFAULT_SETTINGS: AppSettings = {
  discount_cap:         25,
  discount_alloc_cont:  10,
  discount_alloc_vol:   5,
  discount_alloc_nivel: 5,
  discount_alloc_freq:  5,
  anomaly_multidevice_count:  2,
  anomaly_multidevice_window: 60,
  anomaly_daily_entries:      3,
  anomaly_geo_branches:       2,
  anomaly_geo_window:         30,
  anomaly_inactivity_days:    7,
  session_inactivity_minutes: 60,
  session_max_hours:          0,
}

function writeSessionKeysToStorage(settings: AppSettings) {
  localStorage.setItem(KEY_INACTIVITY_MINUTES, String(settings.session_inactivity_minutes))
  localStorage.setItem(KEY_SESSION_HOURS,      String(settings.session_max_hours))
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('gestionar-configuracion', {
        body: { action: 'get' },
      })
      if (fnErr) throw fnErr
      if (!data?.ok) throw new Error(data?.error ?? 'Error desconocido')

      const merged: AppSettings = { ...DEFAULT_SETTINGS, ...data.settings }
      setSettings(merged)
      writeSessionKeysToStorage(merged)
    } catch (e: any) {
      setError(e.message)
      // En caso de error, escribir defaults para que useAuth funcione
      writeSessionKeysToStorage(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }, [])

  const save = useCallback(async (next: AppSettings) => {
    const { data, error: fnErr } = await supabase.functions.invoke('gestionar-configuracion', {
      body: { action: 'set', settings: next },
    })
    if (fnErr) throw fnErr
    if (!data?.ok) throw new Error(data?.error ?? 'Error al guardar')

    setSettings(next)
    writeSessionKeysToStorage(next)
  }, [])

  return { settings, loading, error, load, save }
}
