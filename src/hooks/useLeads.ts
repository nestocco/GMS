// src/hooks/useLeads.ts
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Lead, LeadEstado } from '../types'

export function useLeads(estado?: LeadEstado) {
  const [leads, setLeads]     = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tick, setTick]       = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const body: Record<string, unknown> = { action: 'list' }
      if (estado) body.estado = estado

      const { data, error: fnErr } = await supabase.functions.invoke('gestionar-leads', { body })

      if (cancelled) return

      if (fnErr || !data?.ok) {
        setError(data?.error ?? fnErr?.message ?? 'Error al cargar prospectos')
        setLeads([])
      } else {
        setLeads(data.leads ?? [])
      }
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [estado, tick])

  const refetch = () => setTick(t => t + 1)

  return { leads, loading, error, refetch }
}
