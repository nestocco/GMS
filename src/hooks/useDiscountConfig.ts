// src/hooks/useDiscountConfig.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface DiscountConfig {
  id: string
  antiguedadTier1Days: number
  antiguedadTier1Pct: number  // stored as 0.05 = 5%
  antiguedadTier2Days: number
  antiguedadTier2Pct: number
  volumenTier1Days: number
  volumenTier1Pct: number
  volumenTier2Days: number
  volumenTier2Pct: number
  nivelSilverGoldPct: number
  nivelVipPremiumPct: number
  maxDiscountPct: number
}

export function useDiscountConfig() {
  const [config, setConfig] = useState<DiscountConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchConfig() {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('discount_config')
        .select('*')
        .limit(1)
        .single()

      if (err) {
        setError(err.message)
      } else if (data) {
        setConfig({
          id: data.id,
          antiguedadTier1Days: data.antiguedad_tier1_days,
          antiguedadTier1Pct: Number(data.antiguedad_tier1_pct),
          antiguedadTier2Days: data.antiguedad_tier2_days,
          antiguedadTier2Pct: Number(data.antiguedad_tier2_pct),
          volumenTier1Days: data.volumen_tier1_days,
          volumenTier1Pct: Number(data.volumen_tier1_pct),
          volumenTier2Days: data.volumen_tier2_days,
          volumenTier2Pct: Number(data.volumen_tier2_pct),
          nivelSilverGoldPct: Number(data.nivel_silver_gold_pct),
          nivelVipPremiumPct: Number(data.nivel_vip_premium_pct),
          maxDiscountPct: Number(data.max_discount_pct),
        })
      }
      setLoading(false)
    }

    fetchConfig()
  }, [])

  async function saveConfig(updated: DiscountConfig): Promise<boolean> {
    setSaving(true)
    setError(null)

    const { error: err } = await supabase
      .from('discount_config')
      .update({
        antiguedad_tier1_days: updated.antiguedadTier1Days,
        antiguedad_tier1_pct: updated.antiguedadTier1Pct,
        antiguedad_tier2_days: updated.antiguedadTier2Days,
        antiguedad_tier2_pct: updated.antiguedadTier2Pct,
        volumen_tier1_days: updated.volumenTier1Days,
        volumen_tier1_pct: updated.volumenTier1Pct,
        volumen_tier2_days: updated.volumenTier2Days,
        volumen_tier2_pct: updated.volumenTier2Pct,
        nivel_silver_gold_pct: updated.nivelSilverGoldPct,
        nivel_vip_premium_pct: updated.nivelVipPremiumPct,
        max_discount_pct: updated.maxDiscountPct,
        updated_at: new Date().toISOString(),
      })
      .eq('id', updated.id)

    setSaving(false)

    if (err) {
      setError(err.message)
      return false
    }

    setConfig(updated)
    return true
  }

  return { config, loading, saving, error, saveConfig }
}
