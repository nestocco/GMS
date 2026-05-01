// src/hooks/useGymSettings.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface GymSettings {
  requireGuardianForMinors: boolean
  renewalAdvanceDays: number
}

const DEFAULTS: GymSettings = {
  requireGuardianForMinors: true,
  renewalAdvanceDays: 7,
}

export function useGymSettings() {
  const [settings, setSettings] = useState<GymSettings>(DEFAULTS)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase
      .from('gym_settings')
      .select('key, value')
      .then(({ data }) => {
        if (!data) return
        const map: GymSettings = { ...DEFAULTS }
        for (const row of data) {
          if (row.key === 'require_guardian_for_minors') {
            map.requireGuardianForMinors = row.value === true || row.value === 'true'
          }
          if (row.key === 'renewal_advance_days') {
            map.renewalAdvanceDays = Number(row.value) || DEFAULTS.renewalAdvanceDays
          }
        }
        setSettings(map)
      })
      .finally(() => setLoading(false))
  }, [])

  return { settings, loading }
}
